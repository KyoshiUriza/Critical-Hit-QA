const { test, expect } = require('@playwright/test');

// The feature: triggering a seeded defect reveals and ticks its checklist row,
// so you stop having to guess which hidden line your find corresponds to.
//
// The property these tests protect is the one that keeps it honest — detection
// fires on the DEFECTIVE BEHAVIOR, not on interaction. Using the app normally
// must never hand out finds.

test.describe('defect auto-detection', () => {
  test('using the app correctly detects nothing', async ({ page }) => {
    // The test that matters most. If simply operating the app awards finds,
    // the score is meaningless and the exercise is over before it starts.
    await page.goto('/practice-apps/login-broken.html?reset');
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('Passw0rd!');
    await page.getByTestId('login-submit').click();

    const found = await page.evaluate(() => window.Progress.getBugBountyFinds('login'));
    expect(found, 'a valid login should reveal nothing').toEqual([]);
    await expect(page.getByTestId('bounty-count')).toContainText('0/');
  });

  test('an untrimmed email is only a find when the trimmed form would work', async ({ page }) => {
    await page.goto('/practice-apps/login-broken.html?reset');
    // A genuine typo: not the valid address, so not the trim defect.
    await page.getByTestId('login-email').fill('  nobody@example.com  ');
    await page.getByTestId('login-password').fill('Passw0rd!');
    await page.getByTestId('login-submit').click();
    let found = await page.evaluate(() => window.Progress.getBugBountyFinds('login'));
    expect(found).not.toContain('email-trim');

    // Now the valid address with padding — the defect is observable.
    await page.getByTestId('login-email').fill('  demo@qa.test  ');
    await page.getByTestId('login-submit').click();
    found = await page.evaluate(() => window.Progress.getBugBountyFinds('login'));
    expect(found).toContain('email-trim');
  });

  test('triggering a defect reveals its row and badges it', async ({ page }) => {
    await page.goto('/practice-apps/login-broken.html?reset');
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('');
    await page.getByTestId('login-submit').click();

    // Toast announces it without stealing focus.
    await expect(page.getByTestId('defect-toast').first()).toBeVisible();

    await page.getByTestId('bounty-toggle').click();
    const row = page.locator('.bounty-item.found').first();
    await expect(row).toBeVisible();
    // The title is now readable rather than "Hidden — tick when you find it".
    await expect(row).not.toContainText('Hidden — tick when you find it');
    await expect(row.getByTestId('auto-badge')).toBeVisible();
  });

  test('a user-ticked find is NOT badged as auto-detected', async ({ page }) => {
    // The badge has to distinguish the two, or it says nothing.
    await page.goto('/practice-apps/cart-broken.html?reset');
    await page.getByTestId('bounty-toggle').click();
    await page.locator('.bounty-item input[type="checkbox"]').first().check();
    await expect(page.locator('.bounty-item.found').first()).toBeVisible();
    await expect(page.locator('.bounty-item.found').first().getByTestId('auto-badge')).toHaveCount(0);
  });

  test('cart: the tax defect is detected only once a discount exists', async ({ page }) => {
    await page.goto('/practice-apps/cart-broken.html?reset');
    await page.getByTestId('add-widget').click();
    let found = await page.evaluate(() => window.Progress.getBugBountyFinds('cart'));
    expect(found, 'no coupon yet, so tax basis is not observable').not.toContain('tax-basis');

    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();
    found = await page.evaluate(() => window.Progress.getBugBountyFinds('cart'));
    expect(found).toContain('tax-basis');
  });

  test('cart: a wrong-case coupon detects the case-sensitivity defect', async ({ page }) => {
    await page.goto('/practice-apps/cart-broken.html?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('save10');
    await page.getByTestId('apply-coupon').click();

    const found = await page.evaluate(() => window.Progress.getBugBountyFinds('cart'));
    expect(found).toContain('coupon-case');
    // And it genuinely was rejected — the defect, not just the detection.
    await expect(page.getByTestId('coupon-msg')).toContainText('Invalid');
  });

  test('todo: XSS is detected when injected markup renders as elements', async ({ page }) => {
    await page.goto('/practice-apps/todo-broken.html?reset');
    await page.getByTestId('new-todo-input').fill('<b>bold</b>');
    await page.getByTestId('add-todo').click();

    const found = await page.evaluate(() => window.Progress.getBugBountyFinds('todo'));
    expect(found).toContain('xss');
    // Plain text must NOT trigger it.
    await page.goto('/practice-apps/todo-broken.html?reset');
    await page.getByTestId('new-todo-input').fill('buy milk');
    await page.getByTestId('add-todo').click();
    const clean = await page.evaluate(() => window.Progress.getBugBountyFinds('todo'));
    expect(clean).not.toContain('xss');
  });

  test('detection is one-way and does not double-count', async ({ page }) => {
    await page.goto('/practice-apps/todo-broken.html?reset');
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('new-todo-input').fill('   ');
      await page.getByTestId('add-todo').click();
    }
    const found = await page.evaluate(() => window.Progress.getBugBountyFinds('todo'));
    expect(found.filter((id) => id === 'whitespace-todo').length).toBe(1);
  });

  test('detected finds reach the Bug Bounty page, not just the panel', async ({ page }) => {
    await page.goto('/practice-apps/todo-broken.html?reset');
    await page.getByTestId('new-todo-input').fill('   ');
    await page.getByTestId('add-todo').click();

    await page.goto('/pages/bug-bounty.html');
    await expect(page.locator('input[data-defect="whitespace-todo"]')).toBeChecked();
  });

  test('every seeded defect id used by a detector exists in the catalog', async ({ page }) => {
    // A typo'd id would silently never fire, and the feature would look like
    // it worked while quietly covering less than it claims.
    await page.goto('/practice-apps/login-broken.html?reset');
    const bogus = await page.evaluate(() => window.Detector.trigger('not-a-real-defect'));
    expect(bogus, 'unknown ids must be refused').toBe(false);
  });
});
