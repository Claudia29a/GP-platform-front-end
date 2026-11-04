import { expect, test } from '@playwright/test';

import { GP_EMAIL, PASSWORD, cleanTestData, createAccount, signIn, tokenFor, uniqueEmail } from './support/app';

test.beforeAll(() => cleanTestData());

test.describe('[e2e] Story 5: sign-in with email and password', () => {
  test('Story 5 AC1 AC2: the user sees the password rules and creates an account', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('tab', { name: 'Create account' }).click();

    await page.locator('#create-name').fill('E2E New User');
    await page.locator('#create-email').fill(uniqueEmail());
    await page.locator('#create-password').fill('secret');
    await expect(page.locator('.rules li.met')).toHaveCount(0);
    await page.locator('#create-password').fill('secret12');
    await expect(page.locator('.rules li.met')).toHaveText([/8 characters/, /number/]);
    await page.locator('#create-password').fill(PASSWORD);
    await expect(page.locator('.rules li.met')).toHaveCount(3);

    await page.locator('#create-confirm').fill(PASSWORD);
    await page.locator('form button[type=submit]').click();

    await expect(page.locator('.role')).toHaveText('Patient');
  });

  test('Story 5 AC3: the user signs in with email and password as a patient', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);

    await signIn(page, email);

    await expect(page.locator('.role')).toHaveText('Patient');
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
  });

  test('Story 5 AC4: a wrong password gives a clear message that stays in view', async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    const email = uniqueEmail();
    await createAccount(request, email);

    await signIn(page, email, 'Wrong1234');

    await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
    await expect(page.getByRole('alert')).toBeInViewport();
  });

  test('Story 5 AC4: an unknown email gets exactly the same message', async ({ page }) => {
    await signIn(page, uniqueEmail(), 'Wrong1234');

    await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
  });

  test('Story 5 AC4: empty fields each get their own message', async ({ page }) => {
    await page.goto('/sign-in');

    await page.locator('form button[type=submit]').click();

    await expect(page.getByText('Please enter your email address.')).toBeVisible();
    await expect(page.getByText('Please enter your password.')).toBeVisible();
  });

  test('Story 5 AC4: an invalid email address gets its own message', async ({ page }) => {
    await page.goto('/sign-in');

    await page.locator('#signin-email').fill('not-an-email');
    await page.locator('#signin-password').fill('Whatever1');
    await page.locator('form button[type=submit]').click();

    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  });

  test('Story 5 AC5: five wrong passwords lock the account, even for the right password', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await request.post('/api/account/login', { data: { email, password: 'Wrong1234' } })).status()).toBe(401);
    }

    await signIn(page, email);

    await expect(page.getByRole('alert')).toContainText('Too many wrong passwords');
  });

  test('Story 5 TAC2: weak passwords and a taken address are refused by the back end', async ({ page, request }) => {
    const email = uniqueEmail();
    const weak = await request.post('/api/account/accounts', { data: { name: 'Weak', email, password: 'secret' } });
    expect(weak.status()).toBe(400);

    await createAccount(request, email);
    const taken = await request.post('/api/account/accounts', { data: { name: 'Again', email: email.toUpperCase(), password: PASSWORD } });
    expect(taken.status()).toBe(409);

    await page.goto('/sign-in');
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.locator('#create-name').fill('Again');
    await page.locator('#create-email').fill(email);
    await page.locator('#create-password').fill(PASSWORD);
    await page.locator('#create-confirm').fill(PASSWORD);
    await page.locator('form button[type=submit]').click();
    await expect(page.getByRole('alert')).toContainText('already exists');
  });

  test('Story 5 TAC5: a forged token is refused', async ({ request }) => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const forged = `${encode({ alg: 'RS256' })}.${encode({ iss: 'carebridge-account-service', aud: ['carebridge'], sub: 'x', email: GP_EMAIL, email_verified: true, exp: 9999999999 })}.c2ln`;

    const response = await request.get('/api/me', { headers: { Authorization: `Bearer ${forged}` } });

    expect(response.status()).toBe(401);
  });

  test('Story 5 TAC6: an account with a GP address is only a patient', async ({ page, request }) => {
    const email = `e2e-fake-gp-${Date.now()}@example.com`;
    await createAccount(request, email);
    const body = await (await request.get('/api/me', { headers: { Authorization: `Bearer ${await tokenFor(request, email)}` } })).json();
    expect(body.role).toBe('PATIENT');

    // The real staff address, still unverified: the account is created, the role is not given.
    const fake = await request.post('/api/account/accounts', { data: { name: 'Fake GP', email: GP_EMAIL, password: PASSWORD } });
    expect([201, 409]).toContain(fake.status());
    await signIn(page, GP_EMAIL);
    await expect(page.locator('.role')).toHaveText('Patient');
    await page.goto('/queue');
    await expect(page).toHaveURL(/ask/);
  });
});
