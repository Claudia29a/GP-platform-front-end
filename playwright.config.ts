import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: a real browser against the real services and databases.
 * Each test is named after the acceptance criterion it proves (docs/acceptance-criteria.md).
 * The address comes from E2E_BASE_URL, so the same tests can run against any environment.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: './e2e/test-output/artifacts',
  // The tests share one database and one queue, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { outputFolder: 'e2e/test-output/report', open: 'never' }], ['junit', { outputFile: 'e2e/test-output/results.xml' }]],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
