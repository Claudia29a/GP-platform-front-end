import { expect, test } from '@playwright/test';

test.describe('[e2e] Settings per environment', () => {
  test('the app gets its settings from the environment, and they are never cached', async ({ request }) => {
    const response = await request.get('/config.json');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['cache-control']).toBe('no-store');
    expect((await response.json()).googleClientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  test('the client ID from the settings reaches Google sign-in', async ({ page, request }) => {
    const { googleClientId } = await (await request.get('/config.json')).json();
    // A stand-in for Google's script, so this test proves our part and does not depend on Google being reachable.
    await page.route('https://accounts.google.com/gsi/client**', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.google = { accounts: { id: {
          initialize: (config) => { window.usedClientId = config.client_id; },
          renderButton: (parent) => { parent.textContent = 'Google button'; },
          disableAutoSelect: () => {},
        } } };`,
      }),
    );

    await page.goto('/sign-in');

    await expect(page.locator('.google-button')).toHaveText('Google button');
    expect(await page.evaluate(() => (window as unknown as { usedClientId: string }).usedClientId)).toBe(googleClientId);
  });
});
