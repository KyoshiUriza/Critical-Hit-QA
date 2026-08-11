// The First 90 Days and Suite Health tracks. Suite Health is the riskier of
// the two: it makes specific claims about THIS repository's tests, which is
// what makes it credible and also what makes it rot the moment a file is
// renamed. Those claims are checked against the filesystem here.
const { test, expect } = require('@playwright/test');

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const NINETY = '/pages/learn/first-90-days.html';
const HEALTH = '/pages/learn/suite-health.html';

test.describe('First 90 Days track', () => {
  test('is reachable from the Learn hub', async ({ page }) => {
    await page.goto('/pages/learn.html?reset');
    const card = page.locator('a.feature-card[href="learn/first-90-days.html"]');
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('h1')).toHaveText('Your First 90 Days');
  });

  test('covers the whole arc, not just week one', async ({ page }) => {
    // The value is in the months nobody writes about. A page that stopped at
    // "ask for access" would be the same advice as everywhere else.
    await page.goto(NINETY + '?reset');
    for (const id of ['#week1', '#weeks2-4', '#firstbug', '#undocumented', '#month2', '#month3', '#traps']) {
      await expect(page.locator(id), `${id} missing`).toHaveCount(1);
    }
  });

  test('tells new joiners to calibrate down, consistent with the drill', async ({ page }) => {
    // The severity drill teaches that over-rating costs credibility. This page
    // would contradict it if it told a new joiner to escalate everything.
    await page.goto(NINETY + '?reset');
    const text = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/calibrate down/i);
    expect(text).toMatch(/credibility/i);
  });

  test('treats missing documentation as the normal case', async ({ page }) => {
    await page.goto(NINETY + '?reset');
    const text = (await page.locator('#undocumented').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/normal case/i);
    // And it must name where to look instead, or it is just sympathy.
    expect(text).toMatch(/test suite/i);
    expect(text).toMatch(/support tickets/i);
  });
});

test.describe('Suite Health track', () => {
  test('is reachable from the Learn hub', async ({ page }) => {
    await page.goto('/pages/learn.html?reset');
    const card = page.locator('a.feature-card[href="learn/suite-health.html"]');
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('h1')).toHaveText('Suite Health');
  });

  test('every spec file it names actually exists', async ({ page }) => {
    // This is the whole credibility of the page. It tells a learner to go and
    // read specific files in this repo; a renamed file turns the strongest
    // section into a broken promise.
    await page.goto(HEALTH + '?reset');
    const named = await page.locator('main').evaluate((el) =>
      [...new Set((el.textContent.match(/[a-z0-9-]+\.spec\.js/g) || []))]
    );
    expect(named.length, 'the page should cite real spec files by name').toBeGreaterThanOrEqual(4);

    const onDisk = fs.readdirSync(path.join(ROOT, 'tests'));
    const missing = named.filter((f) => !onDisk.includes(f));
    expect(missing, 'the page cites spec files that do not exist').toEqual([]);
  });

  test('the guard stories it tells match tests that are really there', async ({ page }) => {
    // Each cited file is claimed to contain a derived guard. If the guard was
    // removed, the page is telling a story about code that no longer exists.
    await page.goto(HEALTH + '?reset');
    const named = await page.locator('#guards').evaluate((el) =>
      [...new Set((el.textContent.match(/[a-z0-9-]+\.spec\.js/g) || []))]
    );
    const thin = [];
    for (const f of named) {
      const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
      // A guard reads its expected value from the app rather than restating
      // it, so it will reference the data or the filesystem.
      if (!/window\.(APP_DEFECTS|LOCATOR_EXERCISES|API_EXERCISES|CODE_REVIEW_EXERCISES|QUIZ_QUESTIONS)|readdirSync|getComputedStyle/.test(src)) {
        thin.push(f + ': cited as a guard but derives nothing');
      }
    }
    expect(thin).toEqual([]);
  });

  test('the retry claim matches the real Playwright config', async ({ page }) => {
    // The page states this suite retries once on CI and not locally, and
    // recommends the asymmetry. If the config changed, the page is teaching
    // from an example that is no longer true.
    await page.goto(HEALTH + '?reset');
    const text = (await page.locator('#flake').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/retries:\s*1/);

    const config = fs.readFileSync(path.join(ROOT, 'playwright.config.js'), 'utf8');
    expect(config, 'the page claims CI-only retries').toMatch(/retries:\s*process\.env\.CI\s*\?\s*1\s*:\s*0/);
  });

  test('the regression snippet it quotes is really in the suite', async ({ page }) => {
    // The page quotes a comment from smoke.spec.js to make a point about why
    // a test exists. A paraphrase would undercut the entire framing.
    await page.goto(HEALTH + '?reset');
    const quoted = (await page.locator('#regression pre').first().textContent());
    const smoke = fs.readFileSync(path.join(ROOT, 'tests', 'smoke.spec.js'), 'utf8');

    const line = "await expect(page.locator('.site-header .rpg-chip')).toBeVisible();";
    expect(quoted, 'the quoted assertion is not what the page shows').toContain(line);
    expect(smoke, 'the quoted assertion is no longer in the suite').toContain(line);
    expect(smoke, 'the comment that gives the assertion its meaning is gone')
      .toContain('Nine pages shipped without');
  });

  test('does not treat test count or coverage percentage as health', async ({ page }) => {
    await page.goto(HEALTH + '?reset');
    const text = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/coverage.{0,40}(floor|misleads?)/i);
    expect(text, 'it must say plainly that more tests is not healthier')
      .toMatch(/not healthier|is a cost as well/i);
  });

  test('the link out to the suite points at a real place', async ({ page }) => {
    await page.goto(HEALTH + '?reset');
    const link = page.getByTestId('suite-link');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('href', /github\.com\/KyoshiUriza\/Critical-Hit-QA\/tree\/main\/tests/);
  });
});

test.describe('both tracks', () => {
  for (const [name, url] of [['first-90-days', NINETY], ['suite-health', HEALTH]]) {
    test(`${name}: internal links resolve and the contents jump to real sections`, async ({ page }) => {
      await page.goto(url + '?reset');
      const hrefs = await page.locator('main a[href]').evaluateAll((as) =>
        as.map((a) => a.href).filter((h) => h.startsWith('http://localhost') && !h.includes('#'))
      );
      expect(hrefs.length).toBeGreaterThan(3);
      for (const href of [...new Set(hrefs)]) {
        const resp = await page.request.get(href);
        expect(resp.status(), `${href} is broken`).toBe(200);
      }
      const anchors = await page.locator('.section-toc a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(anchors.length).toBeGreaterThan(4);
      for (const a of anchors) await expect(page.locator(a), `${a} has no target`).toHaveCount(1);
    });
  }
});
