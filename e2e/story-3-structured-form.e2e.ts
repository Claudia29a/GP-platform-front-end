import { expect, test } from '@playwright/test';

import { GP_EMAIL, cleanTestData, createAccount, signInAsNewPatient, signInAsStaff, tokenFor, uniqueEmail } from './support/app';

test.beforeAll(() => cleanTestData());

test.describe('[e2e] Story 3: structured question form', () => {
  test('Story 3 AC5: nothing is sent while required answers are missing, each gets a message', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.getByRole('button', { name: 'Send question' }).click();

    await expect(page.getByText('Please choose where the problem is.')).toBeVisible();
    await expect(page.getByText('Please choose how long it has been going on.')).toBeVisible();
    await expect(page.getByText('Please choose a number from 1 to 10.')).toBeVisible();
    await expect(page.getByText('Please answer yes or no.')).toHaveCount(2);
    await expect(page.getByText('Please describe your question.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your question has been sent' })).toHaveCount(0);
  });

  test('Story 3 AC4: Other needs a description of where the problem is', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.locator('#area-OTHER').check();
    await page.getByRole('button', { name: 'Send question' }).click();

    await expect(page.getByLabel('Where exactly?')).toBeVisible();
    await expect(page.getByText('Please say where the problem is.')).toBeVisible();
  });

  test('Story 3 AC3: yes needs an explanation, back to no removes that requirement', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.locator('#medication-yes').check();
    await page.getByRole('button', { name: 'Send question' }).click();
    await expect(page.getByText('Please say which medication or treatment you take.')).toBeVisible();

    await page.locator('#medication-no').check();
    await expect(page.getByLabel('Which medication or treatment?')).toHaveCount(0);
    await expect(page.getByText('Please say which medication or treatment you take.')).toHaveCount(0);
  });

  test('Story 3 AC1 AC2 AC6: all answers reach the patient and the practice', async ({ browser, page, request }) => {
    await signInAsNewPatient(page, request);
    await page.locator('#area-CHEST_BREATHING').check();
    await page.locator('#duration-ONE_TO_FOUR_WEEKS').check();
    await page.locator('#severity-7').check();
    await page.locator('#symptom-COUGH').check();
    await page.locator('#symptomsOther').fill('Hoarse voice');
    await page.locator('#medication-yes').check();
    await page.locator('#currentMedication').fill('Inhaler');
    await page.locator('#tried-yes').check();
    await page.locator('#treatmentTried').fill('Honey and tea');
    await page.locator('#description').fill('Cough that will not go away');
    await page.getByRole('button', { name: 'Send question' }).click();
    await page.getByRole('link', { name: 'View your question' }).click();

    const expected = ['Chest & breathing', '1–4 weeks', '7 / 10', 'Cough', 'Hoarse voice', 'Yes: Inhaler', 'Yes: Honey and tea', 'Cough that will not go away'];
    for (const text of expected) {
      await expect(page.locator('section.card')).toContainText(text);
    }

    const url = page.url();
    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, GP_EMAIL);
    await staff.goto(url);
    for (const text of expected) {
      await expect(staff.locator('section.card')).toContainText(text);
    }
  });

  test('Story 3 TAC2: the back end answers 400 with an error for each field', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);

    const response = await request.post('/api/intakes', {
      headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
      data: { severity: 11 },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Object.keys(body.errors)).toEqual(expect.arrayContaining(['complaintArea', 'duration', 'severity', 'description']));
  });

  test('Story 3 TAC3: the back end enforces the conditional rules and ignores text after no', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    const headers = { Authorization: `Bearer ${await tokenFor(request, email)}` };
    const form = { complaintArea: 'SKIN', duration: 'ONE_TO_THREE_DAYS', severity: 3, takesMedication: false, triedTreatment: false, description: 'Rash' };

    expect((await request.post('/api/intakes', { headers, data: { ...form, complaintArea: 'OTHER' } })).status()).toBe(400);
    expect((await request.post('/api/intakes', { headers, data: { ...form, takesMedication: true } })).status()).toBe(400);
    expect((await request.post('/api/intakes', { headers, data: { ...form, triedTreatment: true } })).status()).toBe(400);

    const saved = await request.post('/api/intakes', { headers, data: { ...form, currentMedication: 'Left over' } });
    expect(saved.status()).toBe(201);
    expect((await saved.json()).currentMedication).toBeNull();
  });

  test('Story 3 TAC4: every error is linked to its field and focus moves to the first invalid field', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.getByRole('button', { name: 'Send question' }).click();

    await expect(page.locator('#area-HEAD_NECK')).toBeFocused();
    const errors = page.locator('.error:not(:empty)');
    await expect(errors).toHaveCount(6);
    for (const error of await errors.all()) {
      const id = await error.getAttribute('id');
      expect(id, 'each error needs an id').toBeTruthy();
      await expect(page.locator(`[aria-describedby~="${id}"]`).first()).toBeAttached();
    }
  });
});
