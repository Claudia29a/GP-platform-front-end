import { execFileSync } from 'node:child_process';
import { createDecipheriv } from 'node:crypto';

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

/** The rows exactly as they are in the database, which is what someone with a copy of it would see. */
export function storedRows(service: 'account-db' | 'intake-db', database: string, statement: string): string[][] {
  const output = execFileSync(
    'docker',
    ['compose', 'exec', '-T', service, 'psql', '-U', database, '-d', database, '-AtF', '\t', '-c', statement],
    { cwd: BACKEND_DIR, encoding: 'utf8' },
  );
  return output.split('\n').filter(Boolean).map((line) => line.split('\t'));
}

function dataKey(service: 'account-service' | 'intake-service', name: string): Buffer {
  const key = execFileSync('docker', ['compose', 'exec', '-T', service, 'printenv', name], { cwd: BACKEND_DIR, encoding: 'utf8' });
  return Buffer.from(key.trim(), 'base64');
}

/** Personal data is encrypted, so a test needs the key to recognise its own rows: 12 bytes IV, the text, 16 bytes tag. */
function decrypt(stored: string, key: Buffer): string {
  const data = Buffer.from(stored, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(12, data.length - 16)), decipher.final()]).toString('utf8');
}

function accountIdsWith(matches: (email: string) => boolean): string[] {
  const key = dataKey('account-service', 'ACCOUNT_DATA_KEY');
  return storedRows('account-db', 'account', 'select id, email from account')
    .filter(([, email]) => matches(decrypt(email, key)))
    .map(([id]) => id);
}

function quoted(ids: string[]): string {
  return ids.map((id) => `'${id}'`).join(',');
}

/** Removes everything earlier test runs created; real accounts and questions are left alone. */
export function cleanTestData(): void {
  const accounts = accountIdsWith((email) => email.startsWith('e2e-'));
  if (accounts.length) {
    sql('account-db', 'account', `delete from account where id in (${quoted(accounts)})`);
  }
  const key = dataKey('intake-service', 'INTAKE_DATA_KEY');
  const questions = storedRows('intake-db', 'intake', 'select id, patient_email from intake')
    .filter(([, email]) => decrypt(email, key).startsWith('e2e-'))
    .map(([id]) => id);
  if (questions.length) {
    sql('intake-db', 'intake', `delete from intake where id in (${quoted(questions)})`);
  }
}

/** Email verification does not exist yet, so a test marks a staff address as verified in the database. */
export function markEmailVerified(email: string): void {
  const accounts = accountIdsWith((stored) => stored === email);
  sql('account-db', 'account', `update account set email_verified = true where id in (${quoted(accounts)})`);
}

let counter = 0;
export function uniqueEmail(): string {
  return `e2e-patient-${Date.now()}-${++counter}@example.com`;
}

/** Most stories are not about privacy, so a new patient has already allowed the use of their data, unless a test says not. */
export async function createAccount(
  request: APIRequestContext,
  email: string,
  options: { allowPrivacy?: boolean } = {},
): Promise<void> {
  const response = await request.post('/api/account/accounts', { data: { name: 'E2E Patient', email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  if (options.allowPrivacy !== false) {
    const allowed = await request.post('/api/privacy-consent', {
      headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
    });
    expect(allowed.status()).toBe(204);
  }
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
