const { test, expect } = require('@playwright/test');

const LAB = '/practice-apps/locator-lab.html';

// Resolve a locator string in the page and report what it hit.
async function resolve(page, selector, targetCss) {
  return page.evaluate(([sel, css]) => {
    const res = window.LocatorParse.run(sel);
    const want = css ? document.querySelector(css) : null;
    return {
      ok: res.ok,
      count: res.nodes.length,
      hitsTarget: want ? res.nodes.indexOf(want) > -1 : null,
      error: res.error,
      positional: res.positional,
    };
  }, [selector, targetCss || null]);
}

test.describe('Playwright locator syntax is accepted', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LAB + '?reset');
  });

  test('every exercise model answer actually resolves to its target', async ({ page }) => {
    // The bug this guards: the lab printed getByRole as the answer and then
    // refused it. If a model answer stops resolving, the lab is lying again.
    const results = await page.evaluate(() => {
      return window.LOCATOR_EXERCISES.map((ex) => {
        // Pull the locator expression out of whatever the sample shows —
        // some are actions, some are wrapped in expect(...).
        let snippet = ex.playwright.js.replace(/^await\s+/, '').trim();
        const wrapped = /^expect\((.+)\)\s*\.\w+\([^)]*\);?$/s.exec(snippet);
        if (wrapped) snippet = wrapped[1];
        snippet = snippet.replace(/\s*\.\s*(click|fill|check|hover|press)\s*\([^)]*\);?\s*$/s, '');
        const res = window.LocatorParse.run(snippet);
        const want = document.querySelector(ex.target);
        return {
          id: ex.id,
          ok: res.ok,
          count: res.nodes.length,
          hits: want ? res.nodes.indexOf(want) > -1 : false,
          error: res.error,
        };
      });
    });

    for (const r of results) {
      expect(r.ok, `${r.id}: ${r.error}`).toBe(true);
      expect(r.hits, `${r.id} model answer did not match its own target`).toBe(true);
    }
  });

  test('getByRole with an accessible name finds the submit button', async ({ page }) => {
    const r = await resolve(page, "getByRole('button', { name: 'Create account' })",
      "#lab-signup button[type='submit']");
    expect(r.count).toBe(1);
    expect(r.hitsTarget).toBe(true);
  });

  test('a leading page. and a trailing action are tolerated', async ({ page }) => {
    // People paste straight out of a spec file.
    const r = await resolve(page, "await page.getByLabel('Invite by username').fill('x');",
      '.lab-hard-form label:nth-of-type(2) input');
    expect(r.ok).toBe(true);
    expect(r.hitsTarget).toBe(true);
  });

  test('chained roles scope correctly', async ({ page }) => {
    const r = await resolve(page,
      "getByRole('row', { name: /Dana Whitfield/ }).getByRole('button', { name: 'Revoke' })",
      '.lab-hard tbody tr:nth-child(3) button');
    expect(r.count).toBe(1);
    expect(r.hitsTarget).toBe(true);
  });

  test('an unscoped ambiguous name reports every match, not the first', async ({ page }) => {
    // Three identical "Read more" links. Returning 3 is what lets the grader
    // raise a strict-mode violation instead of silently accepting one.
    const r = await resolve(page, "getByRole('link', { name: 'Read more' })");
    expect(r.count).toBe(3);
  });

  test('first() and nth() resolve but are flagged as positional', async ({ page }) => {
    const r = await resolve(page, "getByRole('link', { name: 'Read more' }).first()");
    expect(r.count).toBe(1);
    expect(r.positional, 'positional narrowing must be reported').toBe(true);
  });

  test('filter({ hasText }) narrows a row set', async ({ page }) => {
    const r = await resolve(page,
      "getByRole('row').filter({ hasText: 'Marcus Hale' }).getByRole('button', { name: 'Revoke' })",
      '.lab-hard tbody tr:nth-child(2) button');
    expect(r.count).toBe(1);
    expect(r.hitsTarget).toBe(true);
  });

  test('an unsupported role explains itself instead of failing silently', async ({ page }) => {
    const r = await resolve(page, "getByRole('tablist', { name: 'x' })");
    expect(r.ok).toBe(false);
    expect(r.error).toContain('does not model the role');
  });

  test('CSS and XPath still work', async ({ page }) => {
    await page.getByTestId('locator-input').fill("[data-testid='signup-submit']");
    await page.getByTestId('locator-check').click();
    await expect(page.getByTestId('locator-result')).toContainText('Solid');
  });
});

test.describe('the hard exercises have no escape hatch', () => {
  test('the no-testid region contains no data-testid at all', async ({ page }) => {
    await page.goto(LAB + '?reset');
    const count = await page.locator('.lab-hard [data-testid]').count();
    expect(count, 'the whole point of this region is that the attribute is absent').toBe(0);
  });

  test('reaching for getByTestId there is explained, not just failed', async ({ page }) => {
    await page.goto(LAB + '?reset');
    // Navigate to the first no-testid exercise.
    const idx = await page.evaluate(() =>
      window.LOCATOR_EXERCISES.findIndex((e) => e.noTestId));
    for (let i = 0; i < idx; i++) await page.getByTestId('ex-next').click();

    await page.getByTestId('locator-input').fill("getByTestId('revoke')");
    await page.getByTestId('locator-check').click();
    await expect(page.getByTestId('locator-result')).toContainText('no data-testid attributes');
  });

  test('a positional answer to a hard exercise is graded as fragile', async ({ page }) => {
    await page.goto(LAB + '?reset');
    const idx = await page.evaluate(() =>
      window.LOCATOR_EXERCISES.findIndex((e) => e.id === 'ambiguous-link'));
    for (let i = 0; i < idx; i++) await page.getByTestId('ex-next').click();

    await page.getByTestId('locator-input').fill("getByRole('link', { name: 'Read more' }).nth(1)");
    await page.getByTestId('locator-check').click();
    // It matches the right element — and is still not the answer to commit.
    await expect(page.getByTestId('locator-result')).toContainText('breaks later');
  });

  test('the correct scoped answer to a hard exercise passes cleanly', async ({ page }) => {
    await page.goto(LAB + '?reset');
    const idx = await page.evaluate(() =>
      window.LOCATOR_EXERCISES.findIndex((e) => e.id === 'ambiguous-link'));
    for (let i = 0; i < idx; i++) await page.getByTestId('ex-next').click();

    await page.getByTestId('locator-input')
      .fill("getByRole('article', { name: 'Security' }).getByRole('link', { name: 'Read more' })");
    await page.getByTestId('locator-check').click();
    await expect(page.getByTestId('locator-result')).toContainText('Solid');
  });

  test('at least a third of exercises have no testid available', async ({ page }) => {
    // Guards the complaint that started this: every target having a testid
    // made the lab a lookup rather than a judgment exercise.
    await page.goto(LAB + '?reset');
    const { total, hard } = await page.evaluate(() => ({
      total: window.LOCATOR_EXERCISES.length,
      hard: window.LOCATOR_EXERCISES.filter((e) => e.noTestId).length,
    }));
    expect(hard / total).toBeGreaterThanOrEqual(0.3);
  });
});
