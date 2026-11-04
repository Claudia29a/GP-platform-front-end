import { expect, test } from '@playwright/test';

import {
  ASSISTANT_EMAIL,
  GP_EMAIL,
  askQuestion,
  cleanTestData,
  createAccount,
  signIn,
  signInAsNewPatient,
  signInAsStaff,
  tokenFor,
  uniqueEmail,
} from './support/app';

test.beforeAll(() => cleanTestData());

/**
 * Google's own sign-in screen cannot be automated, so these tests use email sign-in. The role and
 * access rules behind it are the same code. Signing in with Google itself is checked by hand.
 */
test.describe('[e2e] Story 2: sign-in and roles', () => {
  test('Story 2 AC1: the user can sign out again', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page.getByRole('heading', { name: 'Welcome to CareBridge' })).toBeVisible();
    await page.goto('/ask');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('Story 2 AC2: everyone not on a staff list is a patient', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await expect(page.locator('.role')).toHaveText('Patient');
    await expect(page.getByRole('link', { name: 'Ask a question' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My questions' })).toBeVisible();
  });

  test('Story 2 AC2: a GP lands on the Queue with the role GP', async ({ page, request }) => {
    await signInAsStaff(page, request, GP_EMAIL);

    await expect(page).toHaveURL(/queue/);
    await expect(page.locator('.role')).toHaveText('GP');
  });

  test('Story 2 AC2: a GP assistant lands on the Queue with the role GP assistant', async ({ page, request }) => {
    await signInAsStaff(page, request, ASSISTANT_EMAIL);

    await expect(page).toHaveURL(/queue/);
    await expect(page.locator('.role')).toHaveText('GP assistant');
  });

  test('Story 2 AC3: a patient only sees their own questions, staff see all', async ({ browser, page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Question of patient one' });

    const other = await (await browser.newContext()).newPage();
    await signInAsNewPatient(other, request);
    await askQuestion(other, { description: 'Question of patient two' });
    await other.getByRole('link', { name: 'My questions' }).click();
    await expect(other.getByText('Question of patient two')).toBeVisible();
    await expect(other.getByText('Question of patient one')).toHaveCount(0);

    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, GP_EMAIL);
    await staff.getByRole('link', { name: 'All questions' }).click();
    await expect(staff.getByText('Question of patient one')).toBeVisible();
    await expect(staff.getByText('Question of patient two')).toBeVisible();
  });

  test('Story 2 AC4: without signing in no page or data can be opened', async ({ page, request }) => {
    for (const path of ['/ask', '/questions', '/queue']) {
      await page.goto(path);
      await expect(page).toHaveURL(/sign-in/);
    }
    expect((await request.get('/api/intakes')).status()).toBe(401);
    expect((await request.get('/api/queue')).status()).toBe(401);
    expect((await request.get('/api/me')).status()).toBe(401);
  });

  test('Story 2 TAC2: an invalid token gets 401', async ({ request }) => {
    const response = await request.get('/api/me', { headers: { Authorization: 'Bearer not-a-real-token' } });

    expect(response.status()).toBe(401);
  });

  test('Story 2 TAC4: a patient cannot open another patient’s question or the queue', async ({ page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Private question' });
    await page.getByRole('link', { name: 'View your question' }).click();
    await expect(page).toHaveURL(/questions\/.+/);
    const id = page.url().split('/').pop();

    const other = uniqueEmail();
    await createAccount(request, other);
    const headers = { Authorization: `Bearer ${await tokenFor(request, other)}` };

    expect([403, 404]).toContain((await request.get(`/api/intakes/${id}`, { headers })).status());
    expect((await request.get('/api/queue', { headers })).status()).toBe(403);
  });

  test('Story 2 TAC5: a patient typing /queue is sent to their own start page', async ({ page, request }) => {
    await signInAsNewPatient(page, request);

    await page.goto('/queue');

    await expect(page).toHaveURL(/ask/);
  });

  test('Story 2 TAC3: the client cannot choose its own role', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    await signIn(page, email);
    await expect(page.locator('.role')).toHaveText('Patient');
    const me = await request.get('/api/me', {
      headers: { Authorization: `Bearer ${await tokenFor(request, email)}`, 'X-Role': 'GP' },
    });

    expect((await me.json()).role).toBe('PATIENT');
  });
});
