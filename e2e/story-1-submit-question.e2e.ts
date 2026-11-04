import { expect, test } from '@playwright/test';

import { askQuestion, cleanTestData, createAccount, signInAsNewPatient, tokenFor, uniqueEmail } from './support/app';

test.beforeAll(() => cleanTestData());

test.describe('[e2e] Story 1: submit a question', () => {
  test('Story 1 AC1 AC2: the patient types a description and submits it', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await askQuestion(page, { description: 'Itchy rash on my arm' });

    await page.getByRole('link', { name: 'View your question' }).click();
    await expect(page.getByText('Itchy rash on my arm')).toBeVisible();
  });

  test('Story 1 AC3: the patient sees that the question is in review', async ({ page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Status check' });

    await page.getByRole('link', { name: 'View your question' }).click();

    await expect(page.locator('.badge')).toHaveText('In review');
  });

  test('Story 1 TAC5: My questions lists the questions oldest first', async ({ page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'First question' });
    await askQuestion(page, { description: 'Second question' });

    await page.getByRole('link', { name: 'My questions' }).click();

    await expect(page.locator('.description')).toHaveText(['First question', 'Second question']);
  });

  test('Story 1 TAC6: HTML typed into the description is shown as text, never executed', async ({ page, request }) => {
    await signInAsNewPatient(page, request);
    let scriptRan = false;
    page.on('dialog', async (dialog) => {
      scriptRan = true;
      await dialog.dismiss();
    });
    const attack = '<img src=x onerror="alert(1)">';

    await askQuestion(page, { description: attack });
    await page.getByRole('link', { name: 'View your question' }).click();

    await expect(page.getByText(attack)).toBeVisible();
    expect(scriptRan).toBe(false);
  });

  test('Story 1 TAC2: the back end itself rejects an empty and a too long description', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    const headers = { Authorization: `Bearer ${await tokenFor(request, email)}` };
    const form = { complaintArea: 'SKIN', duration: 'ONE_TO_THREE_DAYS', severity: 3, takesMedication: false, triedTreatment: false };

    const empty = await request.post('/api/intakes', { headers, data: { ...form, description: '   ' } });
    const tooLong = await request.post('/api/intakes', { headers, data: { ...form, description: 'x'.repeat(2001) } });

    expect(empty.status()).toBe(400);
    expect(tooLong.status()).toBe(400);
  });

  test('Story 1 TAC7: a request without sign-in gets 401', async ({ request }) => {
    const response = await request.post('/api/intakes', { data: { description: 'No token' } });

    expect(response.status()).toBe(401);
  });
});
