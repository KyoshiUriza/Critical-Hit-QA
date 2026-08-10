// Smoke suite — proves the site loads, the shared chrome renders everywhere,
// and the core loop (hunt -> score -> report) is reachable.
const { test, expect } = require('@playwright/test');

const ALL_PAGES = [
  'index.html',
  'pages/learn.html',
  'pages/learn/manual.html',
  'pages/learn/automation.html',
  'pages/learn/codeless.html',
  'pages/learn/frameworks.html',
  'pages/practice-tests.html',
  'pages/interview-questions.html',
  'pages/practice-apps.html',
  'pages/bug-bounty.html',
  'pages/automation-lab.html',
  'pages/progress.html',
  'pages/tester-lattice.html',
  'pages/study-plan.html',
  'pages/resources.html',
  'pages/test-case-builder.html',
  'pages/bug-report-builder.html',
  'practice-apps/login.html',
  'practice-apps/todo.html',
  'practice-apps/cart.html',
  'practice-apps/register.html',
  'practice-apps/data-table.html',
  'practice-apps/file-upload.html',
  'practice-apps/modal.html',
  'practice-apps/a11y-challenge.html',
  'practice-apps/locator-lab.html',
  'practice-apps/sql-sandbox.html',
  'pages/learn/locators.html',
  'pages/learn/sql.html',
  'pages/playwright-errors.html',
  'pages/portfolio.html',
];

test.describe('shared chrome', () => {
  for (const path of ALL_PAGES) {
    test(`${path} renders header, nav, footer and has no console errors`, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(`/${path}?reset`);

      // Chrome is JS-injected, so its presence proves site-chrome.js ran.
      await expect(page.locator('.site-header')).toBeVisible();
      const navCount = await page.evaluate(() => window.SiteChrome.NAV.length);
      await expect(page.locator('.site-header nav.nav a')).toHaveCount(navCount);
      await expect(page.locator('.site-footer')).toBeVisible();
      await expect(page.getByTestId('donate-link')).toHaveAttribute('rel', 'noopener noreferrer');

      // Skip link is the first tab stop and points at real content.
      await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main');
      await expect(page.locator('#main')).toHaveCount(1);

      // The RPG chip must mount on EVERY page. Nine pages shipped without
      // rpg.js, so the chip was absent there and the header's justify-between
      // slid the nav to the right edge — the nav visibly jumped sideways as
      // you navigated between chip and chip-less pages.
      await expect(page.locator('.site-header .rpg-chip')).toBeVisible();

      expect(errors, `console errors on ${path}`).toEqual([]);
    });
  }
});

test('nav marks exactly one item as current', async ({ page }) => {
  await page.goto('/pages/progress.html?reset');
  const current = page.locator('.site-header nav a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText('Progress');
});

test('learn subpages resolve their nav links from two levels deep', async ({ page }) => {
  await page.goto('/pages/learn/manual.html?reset');
  // A depth-2 page must still highlight Learn and link back to a real home.
  await expect(page.locator('.site-header nav a[aria-current="page"]')).toHaveText('Learn');
  await page.locator('.site-header nav a', { hasText: 'Home' }).click();
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator('h1')).toContainText('Hunt real bugs');
});

test('the core loop is reachable from the hero in three clicks', async ({ page }) => {
  await page.goto('/index.html?reset');
  await page.getByTestId('hero-primary-cta').click();
  // #start, not #buggy. A user persona found that #buggy scrolled PAST the
  // "Not sure where to start?" panel, so the site's biggest button skipped the
  // only copy written for a beginner.
  await expect(page).toHaveURL(/practice-apps\.html#start$/);
  await expect(page.locator('#start')).toBeVisible();

  await page.locator('.site-header nav a', { hasText: 'Bug Bounty' }).click();
  await expect(page.locator('h1')).toContainText('Bug Bounty');

  // "Builders" became "Portfolio" — the destination rather than the tool.
  await page.locator('.site-header nav a', { hasText: 'Portfolio' }).click();
  await expect(page.locator('h1')).toContainText('My Portfolio');
});

// The site is public. These guard the two things that being public changes.
test.describe('public-repo hygiene', () => {
  test('the footer points feedback at GitHub Issues, not a personal inbox', async ({ page }) => {
    await page.goto('/index.html?reset');
    const feedback = page.getByTestId('feedback-link');
    await expect(feedback).toBeVisible();
    const href = await feedback.getAttribute('href');
    expect(href, 'feedback should not be a mailto on a public site').not.toMatch(/^mailto:/);
    expect(href).toContain('github.com/KyoshiUriza/Critical-Hit-QA/issues/new');
    await expect(feedback).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('no personal email address is rendered on any page', async ({ page }) => {
    // A published address gets scraped. This fails if one is reintroduced.
    for (const path of ['index.html', 'pages/portfolio.html', 'practice-apps/locator-lab.html']) {
      await page.goto(`/${path}?reset`);
      const html = await page.content();
      const emails = (html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
        // Fixture addresses used by the practice apps and SQL sandbox are fine.
        .filter((e) => !/test\.example|qa\.test|acme\.com|@x\.com|example\.com|real-customer/i.test(e));
      expect(emails, `real email address rendered on ${path}`).toEqual([]);
    }
  });

  test('the source link is present and safe', async ({ page }) => {
    await page.goto('/index.html?reset');
    const src = page.getByTestId('source-link');
    await expect(src).toBeVisible();
    await expect(src).toHaveAttribute('href', 'https://github.com/KyoshiUriza/Critical-Hit-QA');
    await expect(src).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('the footer credits the source serial and links it', async ({ page }) => {
    // The Lattice vocabulary is borrowed from a published work. Attribution
    // that links back is the whole point, so a broken or missing href here is
    // a real defect rather than cosmetic.
    await page.goto('/index.html?reset');
    const book = page.getByTestId('book-link');
    await expect(book).toBeVisible();
    await expect(book).toHaveAttribute('href', /royalroad\.com\/fiction\/159344\//);
    await expect(book).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(book).toContainText('The Resonance Lattice');
  });
});

test.describe('favicon', () => {
  // Icons are injected by site-chrome.js with depth-derived paths, so a
  // subpath deploy or a new directory level is exactly what would break them.
  for (const path of ['index.html', 'pages/portfolio.html', 'pages/learn/locators.html', 'practice-apps/locator-lab.html']) {
    test(`icons resolve on ${path}`, async ({ page }) => {
      await page.goto(`/${path}?reset`);

      const links = await page.evaluate(() =>
        [...document.querySelectorAll('link[rel*="icon"]')].map((l) => ({
          rel: l.rel,
          href: l.href,           // resolved absolute URL
        }))
      );

      // svg + 32 + 16 + apple-touch
      expect(links, `no icon links on ${path}`).toHaveLength(4);
      expect(links.some((l) => l.href.endsWith('favicon.svg')), 'SVG icon missing').toBe(true);
      expect(links.some((l) => l.rel === 'apple-touch-icon'), 'apple-touch-icon missing').toBe(true);

      for (const l of links) {
        const resp = await page.request.get(l.href);
        expect(resp.status(), `${l.href} did not resolve`).toBe(200);
      }
    });
  }
});
