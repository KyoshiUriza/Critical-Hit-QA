// The test-data track sits underneath the automation material rather than
// beside it: if these claims are wrong, the flake advice elsewhere on the
// site is wrong too. So the claims are asserted, not trusted.
const { test, expect } = require('@playwright/test');

const TRACK = '/pages/learn/test-data.html';

test.describe('Test Data & Environments track', () => {
  test('is reachable from the Learn hub', async ({ page }) => {
    await page.goto('/pages/learn.html?reset');
    const card = page.locator('a.feature-card[href="learn/test-data.html"]');
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('h1')).toHaveText('Test Data & Environments');
  });

  test('leads with the diagnostic, not the cure', async ({ page }) => {
    // "Passes alone, fails in the suite" is the single highest-value thing on
    // the page. If it ever gets edited out, the page loses its point.
    await page.goto(TRACK + '?reset');
    const text = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/passes? alone.*fails? in the suite/i);
    expect(text, 'it must name shared state as the cause').toMatch(/shared state/i);
  });

  test('says retries come after diagnosis, not instead of it', async ({ page }) => {
    // The rest of the site tells learners to eliminate flake. A page that
    // implied retries were the fix would contradict it.
    await page.goto(TRACK + '?reset');
    // Normalised: the source wraps these sentences across lines, so a raw
    // textContent has newlines and indentation sitting inside the phrase.
    const text = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/retries are the thing you add after/i);
    expect(text).toMatch(/ephemeral/i);
  });

  test('treats production data as a legal problem, not a convenience', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const pii = (await page.locator('#pii').textContent()).replace(/\s+/g, ' ');
    expect(pii).toMatch(/GDPR/);
    expect(pii, 'masking must be before the restore, not after').toMatch(/before it lands|before the data arrives/i);
    expect(pii, 'consistency across tables is what makes masking usable').toMatch(/consistent/i);
  });

  test('every internal link resolves and the contents jump to real sections', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const hrefs = await page.locator('main a[href]').evaluateAll((as) =>
      as.map((a) => a.href).filter((h) => h.startsWith('http://localhost') && !h.includes('#'))
    );
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of [...new Set(hrefs)]) {
      const resp = await page.request.get(href);
      expect(resp.status(), `${href} is broken`).toBe(200);
    }

    const anchors = await page.locator('.section-toc a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const a of anchors) await expect(page.locator(a), `${a} has no target`).toHaveCount(1);
  });
});

test.describe('test-data quiz questions', () => {
  test('the bank actually covers the topic the track teaches', async ({ page }) => {
    // A Learn page whose "practice" link leads to a quiz with no questions on
    // the subject is a dead end. This ties the two together.
    await page.goto('/pages/practice-tests.html?reset');
    const hits = await page.evaluate(() => {
      const RE = /test data|shared state|parallel|staging|ephemeral|masked|fixture|unique per test/i;
      return window.QUIZ_QUESTIONS.filter((q) => RE.test(q.question + ' ' + q.explanation)).length;
    });
    expect(hits, 'no quiz questions cover test data or environments').toBeGreaterThanOrEqual(5);
  });

  test('the new questions are well-formed like the rest of the bank', async ({ page }) => {
    await page.goto('/pages/practice-tests.html?reset');
    const problems = await page.evaluate(() => {
      const CATS = ['fundamentals', 'manual', 'automation', 'api', 'agile', 'performance', 'sql', 'ai'];
      const out = [];
      window.QUIZ_QUESTIONS.forEach((q, i) => {
        if (!CATS.includes(q.category)) out.push(i + ': unknown category ' + q.category);
        if (!Array.isArray(q.choices) || q.choices.length !== 4) out.push(i + ': not four choices');
        if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) out.push(i + ': answer out of range');
        // An explanation that only restates the answer teaches nothing.
        if (!q.explanation || q.explanation.length < 80) out.push(i + ': explanation too thin');
        if (new Set(q.choices).size !== q.choices.length) out.push(i + ': duplicate choices');
      });
      return out;
    });
    expect(problems).toEqual([]);
  });

  test('the track links to a quiz category that has questions in it', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const href = await page.locator('#practice a[href*="practice-tests"]').first().getAttribute('href');
    const category = new URL(href, 'http://localhost:8080/pages/learn/').searchParams.get('category');
    expect(category).toBeTruthy();

    await page.goto('/pages/practice-tests.html?reset');
    const n = await page.evaluate(
      (c) => window.QUIZ_QUESTIONS.filter((q) => q.category === c).length, category);
    expect(n, `the track sends learners to an empty category: ${category}`).toBeGreaterThan(0);
  });
});
