// Locator Lab, SQL Sandbox, and the JS/TS code toggle.
const { test, expect } = require('@playwright/test');

test.describe('Locator Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/practice-apps/locator-lab.html?reset');
  });

  test('grades a resilient selector as solid', async ({ page }) => {
    await page.getByTestId('locator-input').fill('[data-testid="signup-submit"]');
    await page.getByTestId('locator-check').click();
    await expect(page.getByTestId('locator-result')).toContainText('Solid');
    // Derived, not hardcoded: the exercise count grows, and pinning "of 6"
    // is the same brittleness this lab exists to teach against.
    const total = await page.evaluate(() => window.LOCATOR_EXERCISES.length);
    await expect(page.getByTestId('lab-score')).toContainText(`1 of ${total}`);
  });

  test('flags a correct-but-brittle selector rather than passing it', async ({ page }) => {
    // Matches the right element via a bundler-generated class.
    await page.getByTestId('locator-input').fill('.btn-a7f3c2');
    await page.getByTestId('locator-check').click();

    const result = page.getByTestId('locator-result');
    await expect(result).toContainText('Works now, breaks later');
    await expect(result).toContainText(/generated class/i);
    // A brittle answer must NOT count as solved.
    const total = await page.evaluate(() => window.LOCATOR_EXERCISES.length);
    await expect(page.getByTestId('lab-score')).toContainText(`0 of ${total}`);
  });

  test('reports a strict-mode violation when several elements match', async ({ page }) => {
    await page.getByTestId('ex-next').click();          // duplicate-delete exercise
    await page.getByTestId('locator-input').fill('.row-delete');
    await page.getByTestId('locator-check').click();

    const result = page.getByTestId('locator-result');
    await expect(result).toContainText('Strict-mode violation');
    await expect(result).toContainText('3 elements');
  });

  test('rejects an invalid selector without throwing', async ({ page }) => {
    await page.getByTestId('locator-input').fill('>>>not valid<<<');
    await page.getByTestId('locator-check').click();
    await expect(page.getByTestId('locator-result')).toContainText('Invalid selector');
  });

  test('reveals the Playwright equivalent only after solving', async ({ page }) => {
    await expect(page.locator('#ex-playwright')).toContainText('Solve the exercise');

    await page.getByTestId('locator-input').fill('[data-testid="signup-submit"]');
    await page.getByTestId('locator-check').click();

    await expect(page.locator('#ex-playwright pre:not([hidden])')).toContainText('getByRole');
  });
});

test.describe('SQL Sandbox', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/practice-apps/sql-sandbox.html?reset');
  });

  test('runs a correct query and marks the exercise solved', async ({ page }) => {
    await page.getByTestId('sql-input').fill("SELECT * FROM users WHERE email = 'ada@test.example'");
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-verdict')).toContainText('Correct');
    await expect(page.getByTestId('sql-score')).toContainText('1 of 8');
  });

  test('distinguishes NULL from an empty string', async ({ page }) => {
    await page.locator('.lab-checklist-btn', { hasText: 'NULL is not an empty string' }).click();

    // The empty-string answer is valid SQL but the wrong result.
    await page.getByTestId('sql-input').fill("SELECT * FROM users WHERE last_login = ''");
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-verdict')).not.toContainText('Correct');

    await page.getByTestId('sql-input').fill('SELECT * FROM users WHERE last_login IS NULL');
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-verdict')).toContainText('Correct');
  });

  test('finds the orphaned order with a LEFT JOIN', async ({ page }) => {
    await page.locator('.lab-checklist-btn', { hasText: 'orphaned order' }).click();
    await page.getByTestId('sql-input').fill(
      'SELECT o.id FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE u.id IS NULL'
    );
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-verdict')).toContainText('Correct');
    await expect(page.getByTestId('sql-output')).toContainText('1006');
  });

  test('refuses a DELETE with no WHERE clause', async ({ page }) => {
    await page.getByTestId('sql-input').fill('DELETE FROM users');
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-verdict')).toContainText('Refused to run');
    // Data must be untouched.
    await page.getByTestId('sql-input').fill('SELECT * FROM users');
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-output')).toContainText('6 rows returned');
  });

  test('rejects unsupported statements clearly', async ({ page }) => {
    await page.getByTestId('sql-input').fill("UPDATE users SET name = 'x'");
    await page.getByTestId('sql-run').click();
    await expect(page.getByTestId('sql-verdict')).toContainText('Only SELECT and DELETE');
  });

  test('renders NULL and empty string differently', async ({ page }) => {
    await page.getByTestId('sql-input').fill('SELECT * FROM users');
    await page.getByTestId('sql-run').click();
    // The visual distinction is the whole lesson of the exercise.
    await expect(page.locator('#sql-output .sql-null').first()).toHaveText('NULL');
    await expect(page.locator('#sql-output .sql-empty').first()).toHaveText("''");
  });
});

test.describe('JS / TS code toggle', () => {
  test('defaults to JavaScript', async ({ page }) => {
    await page.goto('/pages/automation-lab.html?reset');
    await expect(page.getByTestId('code-lang-js')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.code-sample [data-lang="js"]').first()).toBeVisible();
    await expect(page.locator('.code-sample [data-lang="ts"]').first()).toBeHidden();
  });

  test('switches every sample and persists across pages', async ({ page }) => {
    await page.goto('/pages/automation-lab.html?reset');
    await page.getByTestId('code-lang-ts').click();

    await expect(page.locator('.code-sample [data-lang="ts"]').first()).toBeVisible();
    await expect(page.locator('.code-sample [data-lang="js"]').first()).toBeHidden();

    // The choice must survive navigation — otherwise it's a per-page setting.
    await page.goto('/pages/learn/locators.html');
    await expect(page.getByTestId('code-lang-ts')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.code-sample [data-lang="ts"]').first()).toBeVisible();
  });

  test('TypeScript samples show the real differences', async ({ page }) => {
    await page.goto('/pages/automation-lab.html?reset');
    await page.getByTestId('code-lang-ts').click();
    const ts = page.locator('#language .code-sample [data-lang="ts"]').first();
    await expect(ts).toContainText('login.spec.ts');
    await expect(ts).toContainText('readonly page: Page');
  });
});

// Exercise counts are quoted in prose across the site and have drifted twice
// (Locator Lab said six after growing to nine). Derived, not restated.
test.describe('quoted exercise counts', () => {
  const WORDS = { 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };

  test('every page that quotes a lab size quotes the real one', async ({ page }) => {
    await page.goto('/practice-apps/locator-lab.html?reset');
    const locators = await page.evaluate(() => window.LOCATOR_EXERCISES.length);
    await page.goto('/practice-apps/api-lab.html?reset');
    const api = await page.evaluate(() => window.API_EXERCISES.length);
    await page.goto('/pages/code-review.html?reset');
    const review = await page.evaluate(() => window.CODE_REVIEW_EXERCISES.length);

    const wrong = [];
    const check = (text, where, n) => {
      const word = WORDS[n];
      // Any number-word or digit followed by "exercises" must be the real one.
      for (const m of text.matchAll(/(\w+)\s+exercises/gi)) {
        const said = m[1].toLowerCase();
        if (!/^\d+$/.test(said) && !Object.values(WORDS).includes(said)) continue;
        if (said !== String(n) && said !== word) {
          wrong.push(`${where}: says "${m[0]}", should be ${n}`);
        }
      }
    };

    await page.goto('/pages/learn/locators.html?reset');
    check(await page.locator('main').textContent(), 'learn/locators.html', locators);

    await page.goto('/practice-apps/locator-lab.html?reset');
    check(await page.locator('main').textContent(), 'locator-lab.html', locators);

    await page.goto('/practice-apps/api-lab.html?reset');
    check(await page.locator('main').textContent(), 'api-lab.html', api);

    await page.goto('/pages/code-review.html?reset');
    check(await page.locator('main').textContent(), 'code-review.html', review);

    expect(wrong).toEqual([]);
  });

  test('the practice apps page quotes each lab correctly', async ({ page }) => {
    await page.goto('/practice-apps/locator-lab.html?reset');
    const locators = await page.evaluate(() => window.LOCATOR_EXERCISES.length);
    await page.goto('/practice-apps/api-lab.html?reset');
    const api = await page.evaluate(() => window.API_EXERCISES.length);

    await page.goto('/pages/practice-apps.html?reset');
    const cards = await page.locator('.app-card').evaluateAll((els) =>
      els.map((e) => ({
        href: (e.querySelector('a[href]') || {}).getAttribute
          ? e.querySelector('a[href]').getAttribute('href') : '',
        meta: (e.querySelector('.app-meta') || {}).textContent || '',
      }))
    );
    const find = (name) => cards.find((c) => c.href.includes(name));
    expect(find('locator-lab').meta).toContain(`${locators} exercises`);
    expect(find('api-lab').meta).toContain(`${api} exercises`);
  });
});
