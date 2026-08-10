// Regression suite — one test per bug the team review surfaced.
// Each asserts the CORRECT behaviour, so if a fix is ever reverted the test
// goes red and names the defect.
const { test, expect } = require('@playwright/test');

test.describe('login (sprint-1 fixes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/practice-apps/login.html?reset');
  });

  test('signs in with valid credentials', async ({ page }) => {
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('Passw0rd!');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-result')).toContainText('Welcome');
  });

  test('result container exists before the first submit', async ({ page }) => {
    // Was only given its data-testid after a submit, so specs could not
    // wait on it — the Automation Lab examples were teaching a broken pattern.
    await expect(page.getByTestId('login-result')).toHaveCount(1);
    await expect(page.getByTestId('login-result')).toHaveAttribute('aria-live', 'polite');
  });

  test('lockout releases the user after the window expires', async ({ page }) => {
    // Regression: fails stayed at MAX after the lock expired, so the very next
    // failure re-locked instantly and the user could never get back in.
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('login-email').fill('demo@qa.test');
      await page.getByTestId('login-password').fill('wrongPass1!');
      await page.getByTestId('login-submit').click();
    }
    await expect(page.getByTestId('login-result')).toContainText(/locked/i);

    // Fast-forward past the 30s lock rather than waiting for it, then reload.
    // The reload matters: lockedUntil is held in memory and only re-read from
    // sessionStorage at init, so this also mirrors the real scenario (user
    // closes the tab and comes back after the lock expires).
    await page.evaluate(() => sessionStorage.setItem('login_locked', String(Date.now() - 1)));
    await page.goto('/practice-apps/login.html');

    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('wrongPass1!');
    await page.getByTestId('login-submit').click();

    // A fresh window means "attempts remaining", NOT an instant re-lock.
    await expect(page.getByTestId('login-result')).toContainText(/attempt\(s\) remaining/i);
  });

  test('error testids are scoped so they cannot collide with register', async ({ page }) => {
    // Both apps used to expose data-testid="email-error", so a Page Object
    // pointed at the wrong page would silently pass.
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-email-error')).toBeVisible();
    await expect(page.getByTestId('login-password-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toHaveCount(0);
  });

  test('password is never persisted by remember-me', async ({ page }) => {
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('Passw0rd!');
    await page.getByTestId('remember-me').check();
    await page.getByTestId('login-submit').click();
    const stored = await page.evaluate(() => Object.assign({}, localStorage));
    expect(stored).not.toHaveProperty('remembered_pw');
    expect(stored).toHaveProperty('remembered_email');
  });
});

test.describe('todo (sprint-1 fixes)', () => {
  test('survives corrupted localStorage instead of dying silently', async ({ page }) => {
    // Regression: an unguarded JSON.parse threw during init, which killed every
    // handler below it — the page looked fine but nothing worked.
    await page.addInitScript(() => localStorage.setItem('practice_todos', '{not json'));
    await page.goto('/practice-apps/todo.html');

    await page.getByTestId('new-todo-input').fill('still works');
    await page.getByTestId('add-todo').click();
    await expect(page.getByTestId('todo-item')).toHaveCount(1);
  });

  test('renders user input as text, never as HTML', async ({ page }) => {
    await page.goto('/practice-apps/todo.html?reset');
    let dialogFired = false;
    page.on('dialog', async (d) => { dialogFired = true; await d.dismiss(); });

    await page.getByTestId('new-todo-input').fill('<img src=x onerror="alert(1)">');
    await page.getByTestId('add-todo').click();

    await expect(page.getByTestId('todo-text')).toHaveText('<img src=x onerror="alert(1)">');
    expect(dialogFired, 'XSS payload executed').toBe(false);
  });
});

test.describe('data table (sprint-1 a11y fix)', () => {
  test('sortable headers are operable by keyboard', async ({ page }) => {
    // WCAG 2.1.1 — the page's own "test ideas" panel asked this question and
    // the answer used to be no.
    await page.goto('/practice-apps/data-table.html?reset');
    const nameHeader = page.getByTestId('th-name');

    await nameHeader.focus();
    await page.keyboard.press('Enter');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    await page.keyboard.press('Enter');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  });
});

test.describe('cart (sprint-1 fix)', () => {
  test('clears the coupon message after checkout', async ({ page }) => {
    await page.goto('/practice-apps/cart.html?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();
    await expect(page.getByTestId('coupon-msg')).toContainText(/applied/i);

    await page.getByTestId('checkout-btn').click();
    // Regression: the "Applied SAVE10" banner used to survive checkout, so the
    // next order looked like it still had a discount.
    await expect(page.getByTestId('coupon-msg')).toHaveText('');
  });

  test('computes tax on the discounted subtotal', async ({ page }) => {
    await page.goto('/practice-apps/cart.html?reset');
    await page.getByTestId('add-widget').click();   // $10
    await page.getByTestId('add-widget').click();   // $10
    await page.getByTestId('add-gadget').click();   // $25  -> subtotal $45
    await expect(page.getByTestId('subtotal')).toHaveText('$45.00');

    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();
    // 8% of the discounted $40.50, not of the raw $45.
    await expect(page.getByTestId('tax')).toHaveText('$3.24');
  });
});

test.describe('progress + continuation (sprint-2)', () => {
  test('shows a next-action card instead of a wall of zeros', async ({ page }) => {
    await page.goto('/pages/progress.html?reset');
    await expect(page.getByTestId('progress-empty-state')).toBeVisible();
    await expect(page.locator('#top-stats')).toBeHidden();
    await expect(page.getByTestId('empty-cta-hunt')).toBeVisible();
  });

  test('remembers which study plan the user was on', async ({ page }) => {
    // Regression: the page hardcoded "1-week" on load, discarding the choice.
    await page.goto('/pages/study-plan.html?reset');
    await page.locator('.category-tab', { hasText: '1-month' }).click();
    await page.locator('input[data-day="0"]').check();

    // Re-navigate WITHOUT ?reset — reloading the reset URL would wipe the very
    // state this test asserts survives.
    await page.goto('/pages/study-plan.html');
    await expect(page.locator('.category-tab.active')).toHaveText(/1-month/);
  });

  test('quiz honours a category deep-link', async ({ page }) => {
    await page.goto('/pages/practice-tests.html?reset&category=automation');
    await expect(page.locator('#category-select')).toHaveValue('automation');
  });
});

test.describe('bug bounty scoring', () => {
  test('records a find and reflects it on the progress dashboard', async ({ page }) => {
    await page.goto('/pages/bug-bounty.html?reset');
    await page.locator('input[type="checkbox"][data-defect]').first().check();

    await page.goto('/pages/progress.html');
    await expect(page.locator('#top-stats')).toBeVisible();
    await expect(page.locator('#bounty-by-app')).toContainText('Login Form');
  });
});
