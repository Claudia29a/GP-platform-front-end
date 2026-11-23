import { APIRequestContext, expect, test } from '@playwright/test';

import {
  ASSISTANT_EMAIL,
  GP_EMAIL,
  PASSWORD,
  cleanTestData,
  createAccount,
  mailTo,
  practiceDay,
  signIn,
  signInAsStaff,
  storedRows,
  tokenFor,
  uniqueEmail,
  verifyEmail,
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
const bearer = async (request: APIRequestContext, email: string) => ({
  Authorization: `Bearer ${await tokenFor(request, email)}`,
});

async function gp(request: APIRequestContext) {
  const staff = await request.post('/api/account/accounts', {
    data: { name: 'E2E Staff', email: GP_EMAIL, password: PASSWORD },
  });
  if (staff.status() === 201) {
    await verifyEmail(request, GP_EMAIL);
  }
  return bearer(request, GP_EMAIL);
}

/** A patient asks a question and the GP replies; with `invite`, the GP asks for an appointment. */
async function invited(request: APIRequestContext, description: string, invite = true) {
  const email = uniqueEmail();
  await createAccount(request, email);
  const asked = await request.post('/api/intakes', {
    headers: await bearer(request, email),
    data: { ...form, description },
  });
  expect(asked.status()).toBe(201);
  const questionId = (await asked.json()).id as string;
  const replied = await request.post(`/api/messaging/questions/${questionId}/replies`, {
    headers: await gp(request),
    data: { text: `${description}: please come in`, appointment: invite },
  });
  expect(replied.status()).toBe(201);
  return { email, questionId, replyId: (await replied.json()).id as string };
}

async function freeTimes(
  request: APIRequestContext,
  email: string,
): Promise<{ start: string; day: string; time: string }[]> {
  const response = await request.get('/api/messaging/appointments/free', {
    headers: await bearer(request, email),
  });
  expect(response.status()).toBe(200);
  return response.json();
}

test.describe('[e2e] User story nr 10: book an appointment', () => {
  test('User story nr 10 AC1 AC2 AC5: from the email link the patient signs in, picks a free time and gets a confirmation', async ({
    page,
    request,
  }) => {
    const { email, questionId } = await invited(request, 'E2E booking from the email');
    const mail = await mailTo(request, email, 'Your GP practice has replied');
    const link = /Make an appointment: (\S+)/.exec(mail.Text)![1];
    expect(link).toContain('/appointment?reply=');

    await page.goto(new URL(link).pathname + new URL(link).search);
    await expect(page).toHaveURL(/\/sign-in\?returnUrl=/);
    await page.locator('#signin-email').fill(email);
    await page.locator('#signin-password').fill(PASSWORD);
    await page.locator('form button[type=submit]').click();

    await expect(page.getByRole('heading', { name: 'Make an appointment' })).toBeVisible();
    const firstDay = page.locator('.day').first();
    const day = (await firstDay.locator('h2').textContent())!.trim();
    const time = (await firstDay.locator('label').first().textContent())!.trim();
    await firstDay.locator('label').first().click();
    await page.getByRole('button', { name: 'Confirm appointment' }).click();

    await expect(page).toHaveURL(new RegExp(`/questions/${questionId}$`));
    await expect(page.locator('.appointment')).toContainText(`Your appointment: ${day} at ${time}`);
    const confirmation = await mailTo(request, email, 'Your appointment at your GP practice');
    expect(confirmation.Text).toContain(`${day} at ${time}`);
    expect(confirmation.Text).not.toContain('E2E booking from the email');
  });

  test('User story nr 10 AC3: a booked time is no longer free, and of two patients picking the same time only one gets it', async ({
    request,
  }) => {
    const anna = await invited(request, 'E2E Anna wants the same time');
    const bram = await invited(request, 'E2E Bram wants the same time');
    const time = (await freeTimes(request, anna.email))[0].start;

    const [first, second] = await Promise.all([
      request.post(`/api/messaging/replies/${anna.replyId}/appointment`, {
        headers: await bearer(request, anna.email),
        data: { start: time },
      }),
      request.post(`/api/messaging/replies/${bram.replyId}/appointment`, {
        headers: await bearer(request, bram.email),
        data: { start: time },
      }),
    ]);

    expect([first.status(), second.status()].sort()).toEqual([201, 409]);
    const loser = first.status() === 409 ? first : second;
    expect((await loser.json()).message).toBe('This time was just taken. Please choose another.');
    expect((await freeTimes(request, anna.email)).map((slot) => slot.start)).not.toContain(time);
  });

  test('User story nr 10 AC4 AC5: the patient cancels, the time is free again and an email confirms it', async ({
    page,
    request,
  }) => {
    const { email, questionId, replyId } = await invited(request, 'E2E booking that is cancelled');
    const time = (await freeTimes(request, email))[0];
    expect(
      (
        await request.post(`/api/messaging/replies/${replyId}/appointment`, {
          headers: await bearer(request, email),
          data: { start: time.start },
        })
      ).status(),
    ).toBe(201);

    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await page.goto(`/questions/${questionId}`);
    await page.getByRole('button', { name: 'Cancel appointment' }).click();

    await expect(page.getByRole('status')).toContainText('Your appointment has been cancelled.');
    await expect(
      page.locator('.appointment').getByRole('link', { name: 'Make an appointment' }),
    ).toBeVisible();
    expect((await freeTimes(request, email)).map((slot) => slot.start)).toContain(time.start);
    const mail = await mailTo(request, email, 'Your appointment has been cancelled');
    expect(mail.Text).toContain(`${time.day} at ${time.time}`);
  });

  test('User story nr 10 AC6: staff see the booked time on the question and in the list of that day', async ({
    page,
    request,
  }) => {
    const { email, questionId, replyId } = await invited(request, 'E2E booking the practice sees');
    const time = (await freeTimes(request, email))[0];
    expect(
      (
        await request.post(`/api/messaging/replies/${replyId}/appointment`, {
          headers: await bearer(request, email),
          data: { start: time.start },
        })
      ).status(),
    ).toBe(201);

    await signInAsStaff(page, request, ASSISTANT_EMAIL);
    await page.goto(`/questions/${questionId}`);
    await expect(page.locator('.appointment')).toContainText(
      `Appointment: ${time.day} at ${time.time}`,
    );
    await expect(page.locator('.appointment button')).toHaveCount(0);

    await page.getByRole('link', { name: 'Appointments' }).click();
    await page.getByLabel('Day').fill(practiceDay(time.start));
    await page.getByLabel('Day').dispatchEvent('change');
    const row = page.locator('.appointment', { hasText: time.time });
    await expect(row).toContainText('E2E');
    await row.getByRole('link', { name: 'Open question' }).click();
    await expect(page).toHaveURL(new RegExp(`/questions/${questionId}$`));
  });

  test('User story nr 10 AC7: only the invited patient books, once, and never staff', async ({
    request,
  }) => {
    const anna = await invited(request, 'E2E only Anna may book');
    const notInvited = await invited(request, 'E2E reply without invitation', false);
    const [first, second] = await freeTimes(request, anna.email);
    const book = async (replyId: string, email: string, start: string) =>
      (
        await request.post(`/api/messaging/replies/${replyId}/appointment`, {
          headers: await bearer(request, email),
          data: { start },
        })
      ).status();

    expect(await book(anna.replyId, notInvited.email, first.start)).toBe(404);
    expect(await book(notInvited.replyId, notInvited.email, first.start)).toBe(404);
    expect(await book(anna.replyId, ASSISTANT_EMAIL, first.start)).toBe(403);
    expect(await book(anna.replyId, anna.email, first.start)).toBe(201);
    expect(await book(anna.replyId, anna.email, second.start)).toBe(409);
  });

  test('User story nr 10 AC8: My data shows the appointment, and deleting the account deletes it', async ({
    page,
    request,
  }) => {
    const { email, questionId, replyId } = await invited(request, 'E2E booking in My data');
    const time = (await freeTimes(request, email))[0];
    expect(
      (
        await request.post(`/api/messaging/replies/${replyId}/appointment`, {
          headers: await bearer(request, email),
          data: { start: time.start },
        })
      ).status(),
    ).toBe(201);

    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();
    await page.goto('/my-data');
    await expect(page.locator('.my-reply')).toContainText(
      `Your appointment: ${time.day} at ${time.time}`,
    );

    await page.getByLabel('I understand this cannot be undone').check();
    await page.getByRole('button', { name: 'Delete my account' }).click();
    await expect(page).toHaveURL(/sign-in/);
    expect(
      storedRows(
        'messaging-db',
        'messaging',
        `select id from appointment where intake_id = '${questionId}'`,
      ),
    ).toHaveLength(0);
  });

  test('User story nr 10: without an invitation the booking page explains that the GP invites first', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    await signIn(page, email);
    await expect(page.getByRole('heading', { name: 'Ask the practice a question' })).toBeVisible();

    await page.goto('/appointment');

    await expect(
      page.getByText('You can make an appointment once your GP has invited you.'),
    ).toBeVisible();
  });
});
