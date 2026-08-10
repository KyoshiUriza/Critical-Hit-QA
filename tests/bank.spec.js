const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/bank.html';

async function transfer(page, { amount, ref, otp, from, to }) {
  if (from) await page.getByTestId('from-account').selectOption(from);
  if (to) await page.getByTestId('to-account').selectOption(to);
  await page.getByTestId('amount').fill(amount);
  if (ref !== undefined) await page.getByTestId('reference').fill(ref);
  await page.getByTestId('review-transfer').click();
  if (otp !== undefined) await page.getByTestId('otp').fill(otp);
  await page.getByTestId('confirm-transfer').click();
}

test.describe('Meridian Bank', () => {
  test('a valid transfer moves money and conserves the total', async ({ page }) => {
    await page.goto(APP + '?reset');
    const totalBefore = await page.getByTestId('total-balance').textContent();

    await transfer(page, { amount: '25.50', ref: 'Books' });

    await expect(page.getByTestId('transfer-ok')).toBeVisible();
    await expect(page.getByTestId('balance-cur')).toHaveText('£1,259.05');
    await expect(page.getByTestId('balance-sav')).toHaveText('£5,445.50');
    // The invariant that matters: an internal transfer creates no money.
    await expect(page.getByTestId('total-balance')).toHaveText(totalBefore);
  });

  test('rejects an amount with more than two decimal places rather than rounding', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('amount').fill('10.005');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('transfer-error')).toContainText('more than 2 decimal places');
    await expect(page.getByTestId('confirm-box')).toBeHidden();
  });

  test('rejects zero, negative, and non-numeric amounts', async ({ page }) => {
    await page.goto(APP + '?reset');
    for (const bad of ['0', '0.00', '-5', 'abc', '']) {
      await page.getByTestId('amount').fill(bad);
      await page.getByTestId('review-transfer').click();
      await expect(page.getByTestId('transfer-error')).toBeVisible();
      await expect(page.getByTestId('confirm-box')).toBeHidden();
    }
  });

  test('rejects a transfer to the same account', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('to-account').selectOption('cur');
    await page.getByTestId('amount').fill('10.00');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('transfer-error')).toContainText('two different accounts');
  });

  test('boundaries: balance and session limit are reported separately', async ({ page }) => {
    await page.goto(APP + '?reset');

    // A penny over the £1,284.55 balance. Both rules are broken here, and the
    // message must name the balance — telling someone they hit a session limit
    // when they are actually out of money sends them to the wrong fix.
    await page.getByTestId('amount').fill('1284.56');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('transfer-error')).toContainText('Insufficient funds');

    // Within balance but over the £1,000 limit: now the limit is the reason.
    await page.getByTestId('amount').fill('1100.00');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('transfer-error')).toContainText('session limit');

    // Exactly on the limit is allowed — the boundary itself, not past it.
    await page.getByTestId('amount').fill('1000.00');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('confirm-box')).toBeVisible();
  });

  test('transfers over £500 require the step-up code', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('amount').fill('600.00');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('otp-field')).toBeVisible();

    await page.getByTestId('otp').fill('000000');
    await page.getByTestId('confirm-transfer').click();
    await expect(page.getByTestId('otp-error')).toContainText('not correct');
    // Nothing moved on a failed second factor.
    await expect(page.getByTestId('balance-cur')).toHaveText('£1,284.55');

    await page.getByTestId('otp').fill('246810');
    await page.getByTestId('confirm-transfer').click();
    await expect(page.getByTestId('transfer-ok')).toBeVisible();
    await expect(page.getByTestId('balance-cur')).toHaveText('£684.55');
  });

  test('small transfers skip the step-up', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('amount').fill('12.00');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('otp-field')).toBeHidden();
  });

  test('the session limit accumulates across transfers', async ({ page }) => {
    await page.goto(APP + '?reset');
    await transfer(page, { amount: '600.00', otp: '246810' });
    await expect(page.getByTestId('limit-used')).toHaveText('£600.00');

    await page.getByTestId('amount').fill('500.00');
    await page.getByTestId('review-transfer').click();
    await expect(page.getByTestId('transfer-error')).toContainText('session limit');
  });

  test('cancelling leaves balances untouched', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('amount').fill('50.00');
    await page.getByTestId('review-transfer').click();
    await page.getByTestId('cancel-transfer').click();
    await expect(page.getByTestId('confirm-box')).toBeHidden();
    await expect(page.getByTestId('balance-cur')).toHaveText('£1,284.55');
  });

  test('the statement records both sides of a transfer', async ({ page }) => {
    await page.goto(APP + '?reset');
    const before = await page.getByTestId('tx-row').count();
    await transfer(page, { amount: '15.00', ref: 'Split bill' });

    await expect(page.getByTestId('tx-row')).toHaveCount(before + 2);
    await expect(page.getByTestId('statement')).toContainText('Split bill');
    await expect(page.getByTestId('statement')).toContainText('-£15.00');
    await expect(page.getByTestId('statement')).toContainText('£15.00');
  });

  test('statement filters narrow by account, direction and reference', async ({ page }) => {
    await page.goto(APP + '?reset');

    await page.getByTestId('filter-type').selectOption('in');
    const amounts = await page.getByTestId('tx-amount').allTextContents();
    expect(amounts.length).toBeGreaterThan(0);
    expect(amounts.every((a) => !a.startsWith('-')), 'money-in filter showed a debit').toBe(true);

    await page.getByTestId('filter-type').selectOption('all');
    await page.getByTestId('filter-text').fill('Rent');
    await expect(page.getByTestId('tx-row')).toHaveCount(1);

    await page.getByTestId('filter-text').fill('nothing matches this');
    await expect(page.getByTestId('tx-row')).toHaveCount(0);
    await expect(page.getByTestId('statement-empty')).toBeVisible();
  });

  test('running balances stay consistent with the header figure', async ({ page }) => {
    await page.goto(APP + '?reset');
    await transfer(page, { amount: '33.33', ref: 'Consistency' });

    // The most recent row for each account should equal that account's balance.
    await page.getByTestId('filter-account').selectOption('cur');
    const topRow = page.getByTestId('tx-row').first();
    const balanceAfter = (await topRow.locator('td').nth(4).textContent()).trim();
    await expect(page.getByTestId('balance-cur')).toHaveText(balanceAfter);
  });
});
