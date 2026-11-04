import { execFileSync } from 'node:child_process';

import { APIRequestContext, Page, expect } from '@playwright/test';

/** Test accounts always use this prefix, so they can be cleaned up and never touch real data. */
export const GP_EMAIL = 'e2e-gp@example.com';
export const ASSISTANT_EMAIL = 'e2e-assistant@example.com';
export const PASSWORD = 'Secret12';

const BACKEND_DIR = process.env['E2E_BACKEND_DIR'] ?? '../GP-platform-back-end';

function sql(service: 'account-db' | 'intake-db', database: string, statement: string): void {
  execFileSync('docker', ['compose', 'exec', '-T', service, 'psql', '-U', database, '-d', database, '-qc', statement], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
  });
}

/** Removes everything earlier test runs created; real accounts and questions are left alone. */
export function cleanTestData(): void {
  sql('account-db', 'account', "delete from account where email like 'e2e-%'");
  sql('intake-db', 'intake', "delete from intake where patient_email like 'e2e-%'");
}

/** Email verification does not exist yet, so a test marks a staff address as verified in the database. */
export function markEmailVerified(email: string): void {
  sql('account-db', 'account', `update account set email_verified = true where email = '${email}'`);
}

let counter = 0;
export function uniqueEmail(): string {
  return `e2e-patient-${Date.now()}-${++counter}@example.com`;
}

export async function createAccount(request: APIRequestContext, email: string, name = 'E2E Patient'): Promise<void> {
  const response = await request.post('/api/account/accounts', { data: { name, email, password: PASSWORD } });
  expect(response.status()).toBe(201);
}

export async function tokenFor(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post('/api/account/login', { data: { email, password: PASSWORD } });
  expect(response.status()).toBe(200);
  return (await response.json()).token;
}

export async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/sign-in');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.locator('form button[type=submit]').click();
}

/** Creates a verified staff account (once per run) and signs in. */
export async function signInAsStaff(page: Page, request: APIRequestContext, email: string): Promise<void> {
  const response = await request.post('/api/account/accounts', { data: { name: 'E2E Staff', email, password: PASSWORD } });
  expect([201, 409]).toContain(response.status());
  markEmailVerified(email);
  await signIn(page, email);
  await expect(page.getByRole('link', { name: 'Queue' })).toBeVisible();
}

export async function signInAsNewPatient(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail();
  await createAccount(request, email);
  await signIn(page, email);
  await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
  return email;
}

export interface Answers {
  description: string;
  severity?: number;
  duration?: string;
  symptoms?: string[];
}

/** Fills in the question form the way a patient does and sends it. */
export async function askQuestion(page: Page, answers: Answers): Promise<void> {
  await page.goto('/ask');
  await page.locator('#area-SKIN').check();
  await page.locator(`#duration-${answers.duration ?? 'ONE_TO_THREE_DAYS'}`).check();
  await page.locator(`#severity-${answers.severity ?? 3}`).check();
  for (const symptom of answers.symptoms ?? []) {
    await page.locator(`#symptom-${symptom}`).check();
  }
  await page.locator('#medication-no').check();
  await page.locator('#tried-no').check();
  await page.locator('#description').fill(answers.description);
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('heading', { name: 'Your question has been sent' })).toBeVisible();
}
