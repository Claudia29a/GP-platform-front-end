import { expect, test } from '@playwright/test';

import { ASSISTANT_EMAIL, GP_EMAIL, PASSWORD, cleanTestData, createAccount, mailTo, signIn, signInAsStaff, storedRows, tokenFor, uniqueEmail, verifyEmail } from './support/app';

test.beforeAll(() => cleanTestData());

const form = { complaintArea: 'SKIN', duration: 'ONE_TO_THREE_DAYS', severity: 3, symptoms: [], takesMedication: false, triedTreatment: false };

/** A patient with a confirmed address asks a question through the API; returns their email and the question ID. */
async function patientAsks(request: import('@playwright/test').APIRequestContext, description: string) {
  const email = uniqueEmail();
  await createAccount(request, email);
  const response = await request.post('/api/intakes', { headers: { Authorization: `Bearer ${await tokenFor(request, email)}` }, data: { ...form, description } });
  expect(response.status()).toBe(201);
  return { email, id: (await response.json()).id as string };
}

test.describe('[e2e] Story 12: the doctor replies', () => {
  test('Story 12 AC1 AC2 AC3: the GP replies, the patient gets an email without health details and reads the reply', async ({ page, request, browser }) => {
    const { email, id } = await patientAsks(request, 'E2E itchy rash that needs a reply');

    await signInAsStaff(page, request, GP_EMAIL);
    await page.goto(`/questions/${id}`);
    await page.getByRole('button', { name: 'Send reply' }).click();
    await expect(page.getByText('Please write a reply.')).toBeVisible();

    await page.getByLabel('Your reply').fill('Please use the cream twice a day.');
    await page.getByRole('button', { name: 'Send reply' }).click();
    await expect(page.getByRole('status')).toContainText('The patient gets an email');
    await expect(page.locator('.replies')).toContainText('Please use the cream twice a day.');

    const mail = await mailTo(request, email, 'Your GP practice has replied');
    expect(mail.Text).toContain(`/questions/${id}`);
    expect(mail.Text).not.toContain('cream');
    expect(mail.Text).not.toContain('itchy rash');

    const patient = await browser.newPage();
    await signIn(patient, email);
    await expect(patient.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await patient.goto(`/questions/${id}`);
    await expect(patient.locator('.replies')).toContainText('Please use the cream twice a day.');
    await expect(patient.locator('.reply-form')).toHaveCount(0);
    await patient.close();
  });

  test('Story 12 AC4: only the GP replies, and a patient reads only replies to their own question', async ({ page, request }) => {
    const { id } = await patientAsks(request, 'E2E question for the reply rules');
    const other = await patientAsks(request, 'E2E question of another patient');

    await signInAsStaff(page, request, ASSISTANT_EMAIL);
    await page.goto(`/questions/${id}`);
    await expect(page.getByText('E2E question for the reply rules')).toBeVisible();
    await expect(page.locator('.reply-form')).toHaveCount(0);

    const assistant = { Authorization: `Bearer ${await tokenFor(request, ASSISTANT_EMAIL)}` };
    expect((await request.post(`/api/messaging/questions/${id}/replies`, { headers: assistant, data: { text: 'Not allowed' } })).status()).toBe(403);
    const patient = { Authorization: `Bearer ${await tokenFor(request, other.email)}` };
    expect((await request.post(`/api/messaging/questions/${other.id}/replies`, { headers: patient, data: { text: 'Not allowed' } })).status()).toBe(403);
    expect((await request.get(`/api/messaging/questions/${id}/replies`, { headers: patient })).status()).toBe(404);
  });

  test("Story 12 TAC4: a patient who deletes their account takes the practice's replies with them", async ({ page, request }) => {
    const { email, id } = await patientAsks(request, 'E2E question whose reply is deleted with the account');
    const staff = await request.post('/api/account/accounts', { data: { name: 'E2E Staff', email: GP_EMAIL, password: PASSWORD } });
    if (staff.status() === 201) {
      await verifyEmail(request, GP_EMAIL);
    }
    const gp = { Authorization: `Bearer ${await tokenFor(request, GP_EMAIL)}` };
    expect((await request.post(`/api/messaging/questions/${id}/replies`, { headers: gp, data: { text: 'A reply that must go' } })).status()).toBe(201);
    expect(storedRows('messaging-db', 'messaging', `select id from reply where intake_id = '${id}'`)).toHaveLength(1);

    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await page.goto('/my-data');
    await expect(page.locator('.my-reply')).toContainText('A reply that must go');
    await page.getByLabel('I understand this cannot be undone').check();
    await page.getByRole('button', { name: 'Delete my account' }).click();
    await expect(page.getByRole('status')).toContainText('Your account and questions have been deleted.');

    expect(storedRows('messaging-db', 'messaging', `select id from reply where intake_id = '${id}'`)).toHaveLength(0);
  });
});
