import { expect, test } from '@playwright/test';

import { PASSWORD, cleanTestData, createAccount, makeAccountOlder, uniqueEmail } from './support/app';

test.beforeAll(() => cleanTestData());

test.describe('[e2e] Story 9: stricter sign-up', () => {
  test('Story 9 AC1: an address whose domain cannot receive email is refused with a clear message', async ({ page, request }) => {
    // .invalid never exists (RFC 2606), like a typo such as gmial.con.
    const email = `e2e-typo-${Date.now()}@carebridge-typo.invalid`;

    await page.goto('/sign-in');
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.locator('#create-name').fill('E2E Typo');
    await page.locator('#create-email').fill(email);
    await page.locator('#create-password').fill(PASSWORD);
    await page.locator('#create-confirm').fill(PASSWORD);
    await page.locator('form button[type=submit]').click();

    await expect(page.getByRole('alert')).toContainText('No email can be delivered to this address');
    const direct = await request.post('/api/account/accounts', { data: { name: 'E2E Typo', email, password: PASSWORD } });
    expect(direct.status()).toBe(422);
  });

  test('Story 9 AC3 TAC3: an account not confirmed within 24 hours is deleted, and the address can sign up again', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { verify: false });

    makeAccountOlder(email, 25);

    // Locally the clean-up runs every 10 seconds (ACCOUNT_CLEANUP_INTERVAL in docker-compose.yml).
    await expect
      .poll(async () => (await request.post('/api/account/login', { data: { email, password: PASSWORD } })).status(), { timeout: 30_000 })
      .toBe(401);
    const again = await request.post('/api/account/accounts', { data: { name: 'E2E Patient', email, password: PASSWORD } });
    expect(again.status()).toBe(201);
  });

  test('Story 9 TAC3: a confirmed account is never deleted by the clean-up', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);

    makeAccountOlder(email, 25);
    await new Promise((resolve) => setTimeout(resolve, 15_000));

    expect((await request.post('/api/account/login', { data: { email, password: PASSWORD } })).status()).toBe(200);
  });
});
