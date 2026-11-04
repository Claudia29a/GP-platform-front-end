import { expect, test } from '@playwright/test';

test.describe('[e2e] Settings per environment', () => {
  test('the app gets its settings from the environment, and they are never cached', async ({ request }) => {
    const response = await request.get('/config.json');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['cache-control']).toBe('no-store');
    expect((await response.json()).googleClientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  test('the Google button appears with the client ID from the settings', async ({ page }) => {
    await page.goto('/sign-in');

    await expect(page.locator('.google-button [role=button]')).toBeVisible({ timeout: 15_000 });
  });
});
