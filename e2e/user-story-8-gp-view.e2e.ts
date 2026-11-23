import { expect, test } from '@playwright/test';

import {
  ASSISTANT_EMAIL,
  GP_EMAIL,
  cleanTestData,
  createAccount,
  signIn,
  signInAsStaff,
  tokenFor,
  uniqueEmail,
} from './support/app';

test.beforeAll(() => cleanTestData());

/** A patient with a confirmed address asks a question with two lines through the API. */
async function patientAsks(request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail();
  await createAccount(request, email);
  const response = await request.post('/api/intakes', {
    headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
    data: {
      complaintArea: 'CHEST_BREATHING',
      duration: 'FOUR_TO_SEVEN_DAYS',
      severity: 7,
      symptoms: ['COUGH', 'FEVER'],
      symptomsOther: 'E2E pattern ringing ears',
      takesMedication: true,
      currentMedication: 'E2E pattern inhaler',
      triedTreatment: false,
      description: 'E2E pattern first line\nE2E pattern second line',
    },
  });
  expect(response.status()).toBe(201);
  return { email, id: (await response.json()).id as string };
}

test.describe('[e2e] User story 8: the GP view', () => {
  test('User story 8 AC1: the queue shows each question in the fixed pattern, with only the first line', async ({
    page,
    request,
  }) => {
    await patientAsks(request);

    await signInAsStaff(page, request, GP_EMAIL);
    const item = page.locator('.queue-item', { hasText: 'E2E pattern first line' });
    await expect(item.locator('[data-pattern]')).toHaveCount(8);
    await expect(item.locator('[data-pattern=where]')).toHaveText('Chest & breathing');
    await expect(item.locator('[data-pattern=how-long]')).toHaveText('4–7 days');
    await expect(item.locator('[data-pattern=bothers]')).toHaveText('Bothers 7/10');
    await expect(item.locator('[data-pattern=symptoms] .tag')).toHaveText(['Fever', 'Cough']);
    await expect(item.locator('[data-pattern=waiting]')).toContainText('Waiting');
    await expect(item).not.toContainText('E2E pattern second line');
  });

  test('User story 8 AC2 AC3: the GP sees the summary and reply box first, and opens the full details with the keyboard', async ({
    page,
    request,
  }) => {
    const { email, id } = await patientAsks(request);

    await signInAsStaff(page, request, GP_EMAIL);
    await page.goto(`/questions/${id}`);
    await expect(page.locator('.summary [data-pattern=bothers]')).toHaveText('7/10');
    await expect(page.locator('.description')).toContainText('E2E pattern second line');
    await expect(page.getByLabel('Your reply')).toBeVisible();
    await expect(page.getByText(email)).toBeHidden();
    await expect(page.getByText('E2E pattern inhaler')).toBeHidden();

    await page.getByText('Full details').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText('Yes: E2E pattern inhaler')).toBeVisible();
    await expect(page.getByText('E2E pattern ringing ears')).toBeVisible();
    await expect(page.locator('.access-log')).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByText(email)).toBeHidden();
  });

  test('User story 8 AC2: the GP assistant sees the same summary without a reply box', async ({
    page,
    request,
  }) => {
    const { id } = await patientAsks(request);

    await signInAsStaff(page, request, ASSISTANT_EMAIL);
    await page.goto(`/questions/${id}`);
    await expect(page.locator('.summary')).toContainText('Chest & breathing');
    await expect(page.locator('.full-details')).toBeVisible();
    await expect(page.locator('.reply-form')).toHaveCount(0);
  });

  test('User story 8 AC5: the patient sees their question as before', async ({ page, request }) => {
    const { email, id } = await patientAsks(request);

    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await page.goto(`/questions/${id}`);
    await expect(page.getByRole('heading', { name: 'Question', exact: true })).toBeVisible();
    await expect(page.getByText('Yes: E2E pattern inhaler')).toBeVisible();
    await expect(page.locator('.summary')).toHaveCount(0);
    await expect(page.locator('details')).toHaveCount(0);
  });
});
