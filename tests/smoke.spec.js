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
      await expect(page.locator('.site-header nav.nav a')).toHaveCount(10);
      await expect(page.locator('.site-footer')).toBeVisible();
      await expect(page.getByTestId('donate-link')).toHaveAttribute('rel', 'noopener noreferrer');

      // Skip link is the first tab stop and points at real content.
      await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main');
      await expect(page.locator('#main')).toHaveCount(1);

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
  await expect(page).toHaveURL(/practice-apps\.html#buggy$/);

  await page.locator('.site-header nav a', { hasText: 'Bug Bounty' }).click();
  await expect(page.locator('h1')).toContainText('Bug Bounty');

  await page.locator('.site-header nav a', { hasText: 'Builders' }).click();
  await expect(page.locator('h1')).toContainText('Bug Report Builder');
});
