import { Page, expect, test } from '@playwright/test';

import { ASSISTANT_EMAIL, GP_EMAIL, askQuestion, cleanTestData, signInAsNewPatient, signInAsStaff, tokenFor, createAccount, uniqueEmail } from './support/app';

test.beforeEach(() => cleanTestData());

/** The descriptions in the queue, top to bottom, limited to the ones this test created. */
async function queueOrder(page: Page, names: string[]): Promise<string[]> {
  const all = await page.locator('.queue-item .description').allTextContents();
  return all.map((text) => text.trim()).filter((text) => names.includes(text));
}

/** Clicks ▲ until `name` is above `other`; other questions may sit in between. */
async function moveAbove(page: Page, name: string, other: string): Promise<void> {
  await expect
    .poll(async () => {
      const order = await queueOrder(page, [name, other]);
      if (order[0] !== name) {
        await page.locator('.queue-item', { hasText: name }).getByRole('button', { name: /up$/ }).click();
      }
      return order;
    })
    .toEqual([name, other]);
}

test.describe('[e2e] Story 4: severity queue', () => {
  test('Story 4 AC1 AC2: the queue shows the highest score first, with each score', async ({ browser, page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Low', severity: 2, duration: 'LESS_THAN_A_DAY' });
    await askQuestion(page, { description: 'High', severity: 9, duration: 'MORE_THAN_A_MONTH', symptoms: ['FEVER', 'PAIN', 'COUGH'] });
    await askQuestion(page, { description: 'Middle', severity: 6, duration: 'ONE_TO_FOUR_WEEKS', symptoms: ['FEVER', 'PAIN'] });

    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, GP_EMAIL);

    await expect.poll(() => queueOrder(staff, ['Low', 'Middle', 'High'])).toEqual(['High', 'Middle', 'Low']);
    await expect(staff.locator('.queue-item', { hasText: 'High' }).locator('.score')).toHaveText('Score 86');
    await expect(staff.locator('.queue-item', { hasText: 'Middle' }).locator('.score')).toHaveText('Score 59');
    await expect(staff.locator('.queue-item', { hasText: 'Low' }).locator('.score')).toHaveText('Score 12');
  });

  test('Story 4 AC3: staff change the order with the arrows and it stays after a reload', async ({ browser, page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'First', severity: 8 });
    await askQuestion(page, { description: 'Second', severity: 2 });

    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, ASSISTANT_EMAIL);
    await expect.poll(() => queueOrder(staff, ['First', 'Second'])).toEqual(['First', 'Second']);

    await moveAbove(staff, 'Second', 'First');

    await staff.reload();
    await expect.poll(() => queueOrder(staff, ['First', 'Second'])).toEqual(['Second', 'First']);
  });

  test('Story 4 TAC8: reordering works with the keyboard', async ({ browser, page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Keyboard first', severity: 8 });
    await askQuestion(page, { description: 'Keyboard second', severity: 7 });

    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, GP_EMAIL);
    const names = ['Keyboard first', 'Keyboard second'];
    await expect.poll(() => queueOrder(staff, names)).toEqual(names);

    await staff.locator('.queue-item', { hasText: 'Keyboard second' }).getByRole('button', { name: /up$/ }).focus();
    await staff.keyboard.press('Enter');

    await expect.poll(() => queueOrder(staff, names)).toEqual(['Keyboard second', 'Keyboard first']);
  });

  test('Story 4 AC4: a new question is never placed above a question staff moved up', async ({ browser, page, request }) => {
    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Serious', severity: 8 });
    await askQuestion(page, { description: 'Moved up', severity: 1 });

    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, GP_EMAIL);
    await expect.poll(() => queueOrder(staff, ['Serious', 'Moved up'])).toEqual(['Serious', 'Moved up']);
    await moveAbove(staff, 'Moved up', 'Serious');

    await askQuestion(page, { description: 'Most severe', severity: 10, duration: 'MORE_THAN_A_MONTH' });

    await staff.getByRole('button', { name: 'Refresh' }).click();
    await expect.poll(() => queueOrder(staff, ['Moved up', 'Most severe'])).toEqual(['Moved up', 'Most severe']);
  });

  test('Story 4 AC5: the Refresh button shows new questions', async ({ browser, page, request }) => {
    const staff = await (await browser.newContext()).newPage();
    await signInAsStaff(staff, request, GP_EMAIL);

    await signInAsNewPatient(page, request);
    await askQuestion(page, { description: 'Just arrived' });

    await staff.getByRole('button', { name: 'Refresh' }).click();
    await expect(staff.getByText('Just arrived')).toBeVisible();
  });

  test('Story 4 AC6 TAC9: the score never reaches a patient', async ({ request }) => {
    const email = uniqueEmail();
    await createAccount(request, email);
    const headers = { Authorization: `Bearer ${await tokenFor(request, email)}` };

    const created = await request.post('/api/intakes', {
      headers,
      data: { complaintArea: 'SKIN', duration: 'ONE_TO_THREE_DAYS', severity: 3, takesMedication: false, triedTreatment: false, description: 'Rash' },
    });
    const list = await request.get('/api/intakes', { headers });

    expect(await created.text()).not.toContain('severityScore');
    expect(await list.text()).not.toContain('severityScore');
    expect((await request.get('/api/queue', { headers })).status()).toBe(403);
  });
});
