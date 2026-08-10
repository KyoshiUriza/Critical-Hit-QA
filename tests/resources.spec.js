const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PAGE = '/pages/resources.html';

test.describe('Resources page links', () => {
  test('every external reference is a real link, not bare text', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    // The page shipped for a long time with zero links. This is the guard
    // against sliding back to a wall of unnavigable names.
    const external = await page.locator('main a[href^="http"]').count();
    expect(external).toBeGreaterThanOrEqual(18);
  });

  test('external links do not leak the referrer or opener', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const bad = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main a[href^="http"]'))
        .filter((a) => a.target === '_blank' && !/noopener/.test(a.rel))
        .map((a) => a.href)
    );
    expect(bad, 'target=_blank without noopener').toEqual([]);
  });

  test('internal links all point at pages that exist', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main a[href]'))
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && !/^(https?:|#|mailto:)/.test(h))
    );
    expect(hrefs.length).toBeGreaterThan(0);

    // Resolve each one against the repo rather than fetching it. A 404 caught
    // here is a 404 that never reaches the deployed site.
    const root = path.join(__dirname, '..');
    const missing = hrefs.filter((h) => {
      const file = h.split('#')[0].split('?')[0];
      return !fs.existsSync(path.join(root, 'pages', file));
    });
    expect(missing, 'resources.html links to files that do not exist').toEqual([]);
  });
});

test.describe('Amazon Associates compliance', () => {
  // Undisclosed affiliate links breach both the Associates Operating Agreement
  // and the FTC endorsement guides. The code couples the tag to the disclosure
  // so the violating state is unreachable; these tests hold that coupling in
  // place, because it is the kind of thing a later refactor quietly separates.

  const affiliateSrc = () =>
    fs.readFileSync(path.join(__dirname, '..', 'js', 'affiliate.js'), 'utf8');

  const configuredTag = () => {
    const m = affiliateSrc().match(/var ASSOCIATE_TAG = "([^"]*)"/);
    expect(m, 'ASSOCIATE_TAG declaration not found — did affiliate.js change shape?').not.toBeNull();
    return m[1];
  };

  test('book links carry an ASIN and are marked as affiliate targets', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const links = page.locator('a[data-affiliate="amazon"]');
    await expect(links).toHaveCount(6);
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    for (const href of hrefs) {
      expect(href, 'affiliate link should be a real Amazon product URL').toMatch(
        /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}/
      );
    }
  });

  test('the disclosure is shown if and only if a tracking ID is set', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const disclosure = page.getByTestId('affiliate-disclosure');
    const tagged = (await page
      .locator('a[data-affiliate="amazon"]')
      .first()
      .getAttribute('href')).includes('tag=');

    if (configuredTag()) {
      expect(tagged, 'a tag is configured, so links must carry it').toBe(true);
      await expect(disclosure).toBeVisible();
      await expect(disclosure).toContainText('Amazon Associate');
    } else {
      // No tag: links stay plain, so there is nothing to disclose.
      expect(tagged, 'no tag configured, so no link should carry one').toBe(false);
      await expect(disclosure).toBeHidden();
    }
  });

  test('a configured tag reaches every book link and reveals the disclosure', async ({ page }) => {
    // Proves the wiring works without waiting for a real tracking ID. Runs the
    // same decoration the shipped file does, with a tag injected.
    await page.goto(PAGE + '?reset');
    const src = affiliateSrc().replace('var ASSOCIATE_TAG = ""', 'var ASSOCIATE_TAG = "unittest-20"');
    await page.evaluate((code) => {
      // eslint-disable-next-line no-eval
      window.eval(code);
    }, src);

    const hrefs = await page
      .locator('a[data-affiliate="amazon"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.length).toBe(6);
    for (const href of hrefs) {
      expect(href).toContain('tag=unittest-20');
    }

    const disclosure = page.getByTestId('affiliate-disclosure');
    await expect(disclosure).toBeVisible();
    await expect(disclosure).toContainText('As an Amazon Associate I earn from qualifying purchases');

    const rels = await page
      .locator('a[data-affiliate="amazon"]')
      .evaluateAll((els) => els.map((e) => e.rel));
    for (const rel of rels) {
      expect(rel, 'monetised links should be marked sponsored').toContain('sponsored');
      expect(rel).toContain('noopener');
    }
  });

  test('applying the tag twice does not double it', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const src = affiliateSrc().replace('var ASSOCIATE_TAG = ""', 'var ASSOCIATE_TAG = "unittest-20"');
    await page.evaluate((code) => { window.eval(code); }, src);
    await page.evaluate((code) => { window.eval(code); }, src);

    const href = await page.locator('a[data-affiliate="amazon"]').first().getAttribute('href');
    expect((href.match(/tag=/g) || []).length).toBe(1);
  });
});
