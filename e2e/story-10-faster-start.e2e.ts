import { expect, test } from '@playwright/test';

test.describe('[e2e] Story 10: faster start', () => {
  test('Story 10 AC2: opening the sign-in page wakes both services at once', async ({ page }) => {
    const intake = page.waitForResponse((response) => response.url().endsWith('/api/actuator/health/liveness'));
    const account = page.waitForResponse((response) => response.url().endsWith('/api/account/actuator/health/liveness'));

    await page.goto('/sign-in');

    expect((await intake).status()).toBe(200);
    expect((await account).status()).toBe(200);
  });
});
