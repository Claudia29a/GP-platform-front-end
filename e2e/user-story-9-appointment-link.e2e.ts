import { APIRequestContext, expect, test } from '@playwright/test';

import {
  ASSISTANT_EMAIL,
  GP_EMAIL,
  cleanTestData,
  createAccount,
  mailTo,
  signIn,
  signInAsStaff,
  tokenFor,
  uniqueEmail,
} from './support/app';

test.beforeAll(() => cleanTestData());

const form = {
  complaintArea: 'SKIN',
  duration: 'ONE_TO_THREE_DAYS',
  severity: 3,
  symptoms: [],
  takesMedication: false,
  triedTreatment: false,
};

/** A patient with a confirmed address asks a question through the API; returns their email and the question ID. */
async function patientAsks(request: APIRequestContext, description: string) {
  const email = uniqueEmail();
  await createAccount(request, email);
  const response = await request.post('/api/intakes', {
    headers: { Authorization: `Bearer ${await tokenFor(request, email)}` },
    data: { ...form, description },
  });
  expect(response.status()).toBe(201);
  return { email, id: (await response.json()).id as string };
}

test.describe("[e2e] User story nr 9: the appointment link in the doctor's email", () => {
  test('User story nr 9 AC1 AC2 AC4: the GP invites the patient, the email links to the booking page and the patient books', async ({
    page,
    request,
    browser,
  }) => {
    const { email, id } = await patientAsks(request, 'E2E question that needs an appointment');

    await signInAsStaff(page, request, GP_EMAIL);
    await page.goto(`/questions/${id}`);
    await expect(page.getByLabel('Invite the patient to make an appointment')).not.toBeChecked();
    await page.getByLabel('Your reply').fill('E2E please come and see me.');
    await page.getByLabel('Invite the patient to make an appointment').check();
    await page.getByRole('button', { name: 'Send reply' }).click();
    await expect(page.getByRole('status')).toContainText('The patient gets an email');

    const mail = await mailTo(request, email, 'Your GP practice has replied');
    expect(mail.Text).toContain(`/questions/${id}`);
    expect(mail.Text).toMatch(/Make an appointment: \S+\/appointment\?reply=/);
    expect(mail.Text).not.toContain('come and see me');
    expect(mail.Text).not.toContain('needs an appointment');

    const patient = await browser.newPage();
    await signIn(patient, email);
    await expect(
      patient.getByRole('heading', { name: 'Ask the practice a question' }),
    ).toBeVisible();
    await patient.goto(`/questions/${id}`);
    const reply = patient.locator('.reply', { hasText: 'E2E please come and see me.' });
    await expect(reply.locator('.appointment')).toContainText(
      'The practice asks you to make an appointment',
    );
    await reply.getByRole('link', { name: 'Make an appointment' }).click();
    await expect(patient.getByRole('heading', { name: 'Make an appointment' })).toBeVisible();
    await patient.close();
  });

  test('User story nr 9 AC3: without the tick, the email has no booking link and the patient sees no invitation', async ({
    page,
    request,
  }) => {
    const { email, id } = await patientAsks(request, 'E2E question without an appointment');

    await signInAsStaff(page, request, GP_EMAIL);
    await page.goto(`/questions/${id}`);
    await page.getByLabel('Your reply').fill('E2E just use the cream.');
    await page.getByRole('button', { name: 'Send reply' }).click();
    await expect(page.getByRole('status')).toContainText('The patient gets an email');
    await expect(
      page.locator('.reply', { hasText: 'E2E just use the cream.' }).locator('.appointment'),
    ).toHaveCount(0);

    const mail = await mailTo(request, email, 'Your GP practice has replied');
    expect(mail.Text).not.toContain('appointment');
  });

  test('User story nr 9 AC5 TAC3: only the GP invites, and a link sent by the GP is ignored', async ({
    page,
    request,
  }) => {
    const { id } = await patientAsks(request, 'E2E question for the invitation rules');

    await signInAsStaff(page, request, ASSISTANT_EMAIL);
    await page.goto(`/questions/${id}`);
    await expect(page.getByText('E2E question for the invitation rules')).toBeVisible();
    await expect(page.getByLabel('Invite the patient to make an appointment')).toHaveCount(0);

    const assistant = { Authorization: `Bearer ${await tokenFor(request, ASSISTANT_EMAIL)}` };
    const refused = await request.post(`/api/messaging/questions/${id}/replies`, {
      headers: assistant,
      data: { text: 'Come in', appointment: true },
    });
    expect(refused.status()).toBe(403);

    const gp = { Authorization: `Bearer ${await tokenFor(request, GP_EMAIL)}` };
    const sent = await request.post(`/api/messaging/questions/${id}/replies`, {
      headers: gp,
      data: { text: 'Come in', appointment: true, appointmentUrl: 'https://evil.example/book' },
    });
    expect(sent.status()).toBe(201);
    const body = await sent.json();
    expect(body.appointment).toBe(true);
    expect(body.appointmentUrl).toMatch(/\/appointment\?reply=/);
    expect(body.appointmentUrl).not.toContain('evil');
  });

  test('User story nr 9 TAC1: My data shows that the practice asked for an appointment', async ({
    page,
    request,
  }) => {
    const { email, id } = await patientAsks(request, 'E2E question shown in My data');
    const gp = { Authorization: `Bearer ${await tokenFor(request, GP_EMAIL)}` };
    expect(
      (
        await request.post(`/api/messaging/questions/${id}/replies`, {
          headers: gp,
          data: { text: 'E2E come in', appointment: true },
        })
      ).status(),
    ).toBe(201);

    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await page.goto('/my-data');
    await expect(page.locator('.my-reply', { hasText: 'E2E come in' })).toContainText(
      'The practice asked you to make an appointment.',
    );
  });

  test('User story nr 9 and 10: the appointment page asks to sign in first', async ({ page }) => {
    await page.goto('/appointment');
    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fappointment/);
  });
});
