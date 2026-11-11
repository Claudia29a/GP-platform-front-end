import { expect, test } from '@playwright/test';

import { PASSWORD, cleanTestData, codeFor, createAccount, signIn, tokenFor, uniqueEmail } from './support/app';

test.beforeAll(() => cleanTestData());

/** A made-up public address from a documentation range, different every run, so the sign-up limit starts at zero. */
function visitorAddress(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 254)}`;
}

test.describe('[e2e] Story 7: email verification', () => {
  test('Story 7 AC1: after creating an account the user is asked for the code from the email', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('tab', { name: 'Create account' }).click();
    const email = uniqueEmail();
    await page.locator('#create-name').fill('E2E New User');
    await page.locator('#create-email').fill(email);
    await page.locator('#create-password').fill(PASSWORD);
    await page.locator('#create-confirm').fill(PASSWORD);
    await page.locator('form button[type=submit]').click();

    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByLabel('Code from the email')).toBeVisible();
  });

  test('Story 7 AC2: the emailed code confirms the address and the user continues', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { verify: false });
    await signIn(page, email);
    await expect(page).toHaveURL(/verify-email/);

    await page.getByLabel('Code from the email').fill(await codeFor(request, email));
    await page.getByRole('button', { name: 'Confirm email address' }).click();

    // Next comes the privacy question (Story 6), then the question form.
    await expect(page.getByRole('dialog', { name: 'Your privacy at CareBridge' })).toBeVisible();
    await expect(page).toHaveURL(/ask/);
  });

  test('Story 7 AC3: a wrong code and asking for new codes get clear messages', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { verify: false });
    await signIn(page, email);
    const code = await codeFor(request, email);

    await page.getByLabel('Code from the email').fill(code === '000000' ? '111111' : '000000');
    await page.getByRole('button', { name: 'Confirm email address' }).click();
    await expect(page.getByRole('alert')).toContainText('This code is not correct or has expired');

    await page.getByLabel('Code from the email').fill('12a');
    await page.getByRole('button', { name: 'Confirm email address' }).click();
    await expect(page.getByText('The code has 6 digits, for example 123456.')).toBeVisible();

    // The code from sign-up was sent less than a minute ago, so a new one has to wait.
    await page.getByRole('button', { name: 'Send a new code' }).click();
    await expect(page.getByRole('alert')).toContainText('Please wait a minute before asking for a new code.');
  });

  test('Story 7 AC4 TAC4: until the address is confirmed, no question can be sent', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { verify: false });
    await signIn(page, email);
    await expect(page).toHaveURL(/verify-email/);

    await page.goto('/ask');
    await expect(page).toHaveURL(/verify-email/);
    await page.goto('/questions');
    await expect(page).toHaveURL(/verify-email/);

    const response = await request.post('/api/intakes', {
      headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
      data: { complaintArea: 'SKIN', duration: 'ONE_TO_THREE_DAYS', severity: 3, symptoms: [], takesMedication: false, triedTreatment: false, description: 'Unverified' },
    });
    expect(response.status()).toBe(403);
  });

  test('Story 7 AC5 TAC5: the sixth account in an hour from one device is refused', async ({ page, request }) => {
    const visitor = visitorAddress();
    for (let i = 0; i < 5; i++) {
      const response = await request.post('/api/account/accounts', {
        headers: { 'X-Forwarded-For': visitor },
        data: { name: 'E2E Bulk', email: uniqueEmail(), password: PASSWORD },
      });
      expect(response.status()).toBe(201);
    }

    await page.setExtraHTTPHeaders({ 'X-Forwarded-For': visitor });
    await page.goto('/sign-in');
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.locator('#create-name').fill('E2E Sixth');
    await page.locator('#create-email').fill(uniqueEmail());
    await page.locator('#create-password').fill(PASSWORD);
    await page.locator('#create-confirm').fill(PASSWORD);
    await page.locator('form button[type=submit]').click();

    await expect(page.getByRole('alert')).toContainText('Too many accounts were created from this device');
  });

  test('Story 7 TAC2: a code works only once', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email, { verify: false });
    const code = await codeFor(request, email);

    expect((await request.post('/api/account/accounts/verify', { data: { email, code } })).status()).toBe(200);
    expect((await request.post('/api/account/accounts/verify', { data: { email, code } })).status()).toBe(400);
  });

  test('Story 7 TAC3: asking for a code for an unknown address reveals nothing', async ({ request }) => {
    const response = await request.post('/api/account/accounts/verify/resend', { data: { email: uniqueEmail() } });

    expect(response.status()).toBe(202);
  });
});
