import { expect, test } from '@playwright/test';

import {
  ASSISTANT_EMAIL,
  PASSWORD,
  askQuestion,
  cleanTestData,
  createAccount,
  signIn,
  signInAsNewPatient,
  signInAsStaff,
  storedRows,
  tokenFor,
  uniqueEmail,
} from './support/app';

test.beforeAll(() => cleanTestData());

test.describe('[e2e] Story 6: privacy and consent', () => {
  const popup = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Your privacy at CareBridge' });

  test('Story 6 AC1: after signing in, a patient sees what happens to their data and that it is safe', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { allowPrivacy: false });

    await signIn(page, email);

    await expect(popup(page)).toBeVisible();
    await expect(popup(page)).toContainText('your GP practice can review your question');
    await expect(popup(page)).toContainText('Your data is safe');
  });

  test('Story 6 AC2: after Allow, the patient can ask a question and is not asked again', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { allowPrivacy: false });
    await signIn(page, email);

    await popup(page).getByRole('button', { name: 'Allow', exact: true }).click();
    await expect(popup(page)).toBeHidden();
    await askQuestion(page, { description: 'E2E question after allowing' });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await expect(popup(page)).toBeHidden();
  });

  test('Story 6 AC3: after Do not allow, the patient is signed out and told why', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { allowPrivacy: false });
    await signIn(page, email);

    await popup(page).getByRole('button', { name: 'Do not allow' }).click();

    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByRole('status')).toContainText('You have been signed out');
  });

  test('Story 6 AC4: the privacy page can be read without signing in', async ({ page }) => {
    await page.goto('/sign-in');

    await page.getByRole('link', { name: 'Read how we handle your data' }).click();

    await expect(page.getByRole('heading', { name: 'Privacy at CareBridge' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your rights' })).toBeVisible();
  });

  test('Story 6 AC5: a patient can withdraw their permission and is asked again', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();
    await page.getByRole('button', { name: 'Withdraw my permission' }).click();

    await expect(popup(page)).toBeVisible();
  });

  test('Story 6 AC6: practice staff are not asked', async ({ page, request }) => {
    await signInAsStaff(page, request, ASSISTANT_EMAIL);

    await expect(popup(page)).toBeHidden();
  });

  test('Story 6 TAC1: the back-end refuses a question without permission', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { allowPrivacy: false });

    const response = await request.post('/api/intakes', {
      headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
      data: {
        complaintArea: 'SKIN',
        duration: 'ONE_TO_THREE_DAYS',
        severity: 3,
        symptoms: [],
        takesMedication: false,
        triedTreatment: false,
        description: 'Without permission',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('Story 6 TAC2: the database shows no answers, names or email addresses', async ({ page, request }) => {
    const description = `Secret complaint ${Date.now()}`;
    const email = await signInAsNewPatient(page, request);
    await askQuestion(page, { description });

    const questions = JSON.stringify(storedRows('intake-db', 'intake', 'select * from intake'));
    const accounts = JSON.stringify(storedRows('account-db', 'account', 'select * from account'));

    expect(questions).not.toContain(description);
    expect(questions).not.toContain(email);
    expect(questions).not.toContain('E2E Patient');
    expect(accounts).not.toContain(email);
    expect(accounts).not.toContain('E2E Patient');
    expect(accounts).not.toContain(PASSWORD);
  });
});
