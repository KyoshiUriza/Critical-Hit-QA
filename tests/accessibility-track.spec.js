// The accessibility track makes factual claims about a legal standard, and it
// cites this site's own defect data. Both are things that rot silently, so
// both are asserted rather than trusted.
const { test, expect } = require('@playwright/test');

const TRACK = '/pages/learn/accessibility.html';

test.describe('accessibility track', () => {
  test('is reachable from the Learn hub — not an orphan page', async ({ page }) => {
    // Every previous content page that shipped unlinked stayed unlinked until
    // a test caught it. A page nobody can navigate to teaches nobody.
    await page.goto('/pages/learn.html?reset');
    const card = page.locator('a.feature-card[href="learn/accessibility.html"]');
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('h1')).toHaveText('Accessibility Testing');
  });

  test('states the WCAG 2.1 AA ratios correctly', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const rows = await page.locator('#contrast table.data-table tbody tr').evaluateAll(
      (trs) => trs.map((tr) => [...tr.cells].map((c) => c.textContent.trim()))
    );
    const byWhat = Object.fromEntries(rows.map((r) => [r[0], { ratio: r[1], sc: r[2] }]));

    // These are the numbers a candidate gets asked for. Wrong here is worse
    // than absent — it would be repeated in an interview as fact.
    expect(byWhat['Body text']).toEqual({ ratio: '4.5:1', sc: '1.4.3' });
    expect(byWhat['Large text (18.66px bold, or 24px)'].ratio).toBe('3:1');
    expect(byWhat['UI component boundaries and states']).toEqual({ ratio: '3:1', sc: '1.4.11' });
    expect(byWhat['Focus indicators'].sc).toBe('2.4.11');
  });

  test('the seeded-defect count it quotes matches the actual defect data', async ({ page }) => {
    // The page tells the learner how many defects to hunt for. That number
    // lives in defects.js and has changed before. Deriving it here means the
    // prose cannot drift away from the app without failing.
    await page.goto('/pages/bug-bounty.html?reset');
    const actual = await page.evaluate(() => window.APP_DEFECTS.a11y.defects.length);

    await page.goto(TRACK + '?reset');
    const practice = await page.locator('#practice').textContent();

    const WORDS = { 11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen' };
    const word = WORDS[actual];
    expect(word, `no spelling for ${actual} defects — extend this map`).toBeTruthy();
    expect(practice, 'the track quotes a stale defect count').toContain(`${word} defects are seeded`);
    // The follow-up step refers back to the same number.
    expect(practice).toContain(`which of the ${word.toLowerCase()}`);
  });

  test('is honest that automated tooling covers the minority', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const auto = await page.locator('#automated').textContent();
    expect(auto).toContain('a third');
    // And it must say what tooling cannot do, not just what it can.
    const headers = await page.locator('#automated table thead th').allTextContents();
    expect(headers.some((h) => /cannot/i.test(h))).toBe(true);
  });

  test('every internal link on the track resolves', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const hrefs = await page.locator('main a[href]').evaluateAll((as) =>
      as.map((a) => a.href).filter((h) => h.startsWith('http://localhost') && !h.includes('#'))
    );
    expect(hrefs.length, 'the track should cross-link into practice').toBeGreaterThan(3);
    for (const href of [...new Set(hrefs)]) {
      const resp = await page.request.get(href);
      expect(resp.status(), `${href} is a broken cross-link`).toBe(200);
    }
  });

  test('the on-page contents jump to sections that exist', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const anchors = await page.locator('.section-toc a').evaluateAll((as) =>
      as.map((a) => a.getAttribute('href'))
    );
    expect(anchors.length).toBeGreaterThan(5);
    for (const a of anchors) {
      await expect(page.locator(a), `${a} has no target`).toHaveCount(1);
    }
  });

  test('the challenge points back at the track that teaches the method', async ({ page }) => {
    // The exercise existed before the teaching did. A learner who lands on the
    // challenge first should be able to find out how to run the passes.
    await page.goto('/practice-apps/a11y-challenge.html?reset');
    const link = page.locator('a[href="../pages/learn/accessibility.html"]');
    await expect(link.first()).toBeVisible();
  });

  test('practices what it preaches — reachable, focusable, escapable', async ({ page }) => {
    // A page teaching the keyboard pass that fails the keyboard pass would be
    // the site's most embarrassing possible defect.
    await page.goto(TRACK + '?reset');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      return { cls: el.className, text: el.textContent.trim(), shadow: cs.boxShadow, outline: cs.outlineStyle };
    });
    expect(first.cls, 'first tab stop should be the skip link').toContain('skip-link');
    expect(first.text).toBe('Skip to content');
    // Visible focus indicator: either a real outline or a ring.
    expect(first.outline !== 'none' || first.shadow !== 'none').toBe(true);
  });
});
