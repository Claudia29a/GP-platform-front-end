import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import {
  ASSISTANT_EMAIL,
  GP_EMAIL,
  PASSWORD,
  askQuestion,
  cleanTestData,
  createAccount,
  signIn,
  signInAsNewPatient,
  signInAsStaff,
  tokenFor,
  uniqueEmail,
  verifyEmail,
} from './support/app';

test.beforeAll(() => cleanTestData());

const form = { complaintArea: 'SKIN', duration: 'ONE_TO_THREE_DAYS', severity: 3, symptoms: [], takesMedication: false, triedTreatment: false };

test.describe('[e2e] Story 8: my data and the access log', () => {
  test('Story 8 AC1: a patient sees their details, permission and questions under My data', async ({ page, request }) => {
    const email = await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'E2E question for My data' });

    await page.getByRole('link', { name: 'My data' }).click();

    await expect(page.getByRole('heading', { name: 'My data' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText('E2E question for My data')).toBeVisible();
    await expect(page.getByText(/Given on/)).toBeVisible();
  });

  test('Story 8 AC2: the patient downloads everything as one file', async ({ page, request }) => {
    const email = await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'E2E question in the download' });
    await page.goto('/my-data');

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()]);

    expect(download.suggestedFilename()).toMatch(/^carebridge-my-data-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(data.user.email).toBe(email);
    expect(data.account.emailVerified).toBe(true);
    expect(data.questions[0].question.description).toBe('E2E question in the download');
  });

  test('Story 8 AC3: the patient deletes their account after confirming, and it is gone', async ({ page, request }) => {
    const email = await signInAsNewPatient(page, request);
    await page.goto('/my-data');

    await page.getByRole('button', { name: 'Delete my account' }).click();
    await expect(page.getByText('Please confirm that you understand this cannot be undone.')).toBeVisible();

    await page.getByLabel('I understand this cannot be undone').check();
    await page.getByRole('button', { name: 'Delete my account' }).click();

    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByRole('status')).toContainText('Your account and questions have been deleted.');
    const login = await request.post('/api/account/login', { data: { email, password: PASSWORD } });
    expect(login.status()).toBe(401);
  });

  test('Story 8 AC4 AC5 AC6: opening a question is recorded, shown to the GP and to the patient', async ({ page, request, browser }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    const sent = await request.post('/api/intakes', {
      headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
      data: { ...form, description: 'E2E question that staff open' },
    });
    const id = (await sent.json()).id;

    // An assistant opens the question.
    const assistant = await browser.newPage();
    await signInAsStaff(assistant, request, ASSISTANT_EMAIL);
    await assistant.goto(`/questions/${id}`);
    await expect(assistant.getByText('E2E question that staff open')).toBeVisible();
    await expect(assistant.locator('.access-log')).toHaveCount(0);
    await assistant.close();

    // The GP sees who opened it.
    await signInAsStaff(page, request, GP_EMAIL);
    await page.goto(`/questions/${id}`);
    await expect(page.locator('.access-log')).toContainText('GP assistant');

    // And so does the patient, under My data.
    const patient = await browser.newPage();
    await signIn(patient, email);
    await expect(patient.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await patient.goto('/my-data');
    await expect(patient.getByText(/Opened by E2E Staff \(GP assistant\)/)).toBeVisible();
    await patient.close();
  });

  test('Story 8 TAC1 TAC4: data comes from the token, and only the GP reads the access log', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    const headers = { Authorization: `Bearer ${await tokenFor(request, email)}` };

    expect((await (await request.get('/api/me/data', { headers })).json()).user.email).toBe(email);
    expect((await (await request.get('/api/account/accounts/me', { headers })).json()).email).toBe(email);

    const sent = await request.post('/api/intakes', { headers, data: { ...form, description: 'E2E access log rights' } });
    const id = (await sent.json()).id;
    const staff = await request.post('/api/account/accounts', { data: { name: 'E2E Staff', email: ASSISTANT_EMAIL, password: PASSWORD } });
    if (staff.status() === 201) {
      await verifyEmail(request, ASSISTANT_EMAIL);
    }
    const assistantToken = await tokenFor(request, ASSISTANT_EMAIL);
    expect((await request.get(`/api/intakes/${id}/access-log`, { headers })).status()).toBe(403);
    expect((await request.get(`/api/intakes/${id}/access-log`, { headers: { Authorization: `Bearer ${assistantToken}` } })).status()).toBe(403);
  });
});
