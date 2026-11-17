import { expect, test } from '@playwright/test';

import { cleanTestData, createAccount, signIn, uniqueEmail } from './support/app';

test.beforeAll(() => cleanTestData());

/** A stand-in for Google's script, so these tests do not depend on Google. */
const googleStandIn = `window.google = { accounts: { id: {
  initialize: () => {}, renderButton: (parent) => { parent.textContent = 'Google button'; }, disableAutoSelect: () => {},
} } };`;

test.describe('[e2e] Story 11: GDPR leftovers', () => {
  test('Story 11 AC2 TAC3: a patient corrects their name, and the practice sees the new name', async ({ page, request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await page.goto('/my-data');

    await page.getByLabel('New name').fill('   ');
    await page.getByRole('button', { name: 'Save name' }).click();
    await expect(page.getByText('Please enter your name.')).toBeVisible();

    await page.getByLabel('New name').fill('E2E Renamed Patient');
    await page.getByRole('button', { name: 'Save name' }).click();
    await expect(page.getByRole('status')).toContainText('Your name has been changed.');
    await expect(page.locator('.name')).toHaveText('E2E Renamed Patient');
  });

  test('Story 11 AC3: nothing is loaded from Google until the user chooses Google', async ({ page }) => {
    const googleRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('google')) {
        googleRequests.push(request.url());
      }
    });
    await page.route('https://accounts.google.com/gsi/client**', (route) =>
      route.fulfill({ contentType: 'application/javascript', body: googleStandIn }),
    );

    await page.goto('/sign-in');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    expect(googleRequests).toEqual([]);

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.locator('.google-button')).toHaveText('Google button');
    expect(googleRequests).toHaveLength(1);
  });

  test('Story 11 AC4: the website sends a Content Security Policy and every page works with it', async ({ page, request }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) {
        violations.push(message.text());
      }
    });
    await page.route('https://accounts.google.com/gsi/client**', (route) =>
      route.fulfill({ contentType: 'application/javascript', body: googleStandIn }),
    );

    const response = await page.goto('/sign-in');
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self' https://accounts.google.com/gsi/client");
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.locator('.google-button')).toHaveText('Google button');

    const email = uniqueEmail();
    await createAccount(request, email);
    await signIn(page, email);
    for (const path of ['/ask', '/questions', '/my-data', '/privacy']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
    }
    // The styles really apply: the top bar is navy, not the browser's default white.
    expect(await page.locator('.topbar').evaluate((bar) => getComputedStyle(bar).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect(violations).toEqual([]);
  });

  test('Story 11 AC5 TAC2: the services refuse requests that do not come through the website', async ({ request }) => {
    // docker-compose.yml publishes the services on these ports, like the direct addresses on Azure.
    const intakeDirect = await request.get('http://localhost:8080/intakes');
    const accountDirect = await request.post('http://localhost:8081/login', { data: { email: 'x@example.com', password: 'x' } });
    expect(intakeDirect.status()).toBe(403);
    expect(accountDirect.status()).toBe(403);
    expect(await intakeDirect.text()).toContain('only through the CareBridge website');

    // Through the website the same requests reach the services, which then check the sign-in as usual.
    expect((await request.get('/api/intakes')).status()).toBe(401);
    expect((await request.post('/api/account/login', { data: { email: 'x@example.com', password: 'x' } })).status()).toBe(401);
    // Health checks and the public key stay open.
    expect((await request.get('http://localhost:8080/actuator/health')).status()).toBe(200);
    expect((await request.get('http://localhost:8081/.well-known/jwks.json')).status()).toBe(200);
  });
});
