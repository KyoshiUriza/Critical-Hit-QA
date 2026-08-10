// Header layout regression suite.
//
// The bug: .header-inner had a fixed height:60px while .nav was flex-wrap:wrap.
// With 10 nav items the nav needed ~84px, so "Study Plan" and "Resources"
// rendered *outside* the header box on any viewport under ~1200px.
const { test, expect } = require('@playwright/test');

const WIDTHS = [1440, 1280, 1200, 1100, 1024, 900, 768, 600, 414, 375];

for (const width of WIDTHS) {
  test(`no nav item escapes the header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html?reset');

    const headerBox = await page.locator('.site-header').boundingBox();

    // Only measure links that are actually rendered.
    const escaped = await page.evaluate((headerBottom) => {
      const links = [...document.querySelectorAll('.site-header .nav a')];
      return links
        .filter((a) => {
          const r = a.getBoundingClientRect();
          return r.height > 0 && r.bottom > headerBottom + 1;
        })
        .map((a) => a.textContent);
    }, headerBox.y + headerBox.height);

    expect(escaped, `nav items rendered outside the header at ${width}px`).toEqual([]);
  });
}

test('wide viewports show the full nav and hide the toggle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html?reset');

  await expect(page.locator('.site-header .nav')).toBeVisible();
  await expect(page.locator('.nav-toggle')).toBeHidden();
  await expect(page.locator('.site-header .nav a').first()).toBeVisible();
});

test('narrow viewports collapse the nav behind an accessible toggle', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/index.html?reset');

  const toggle = page.locator('.nav-toggle');
  const nav = page.locator('#primary-nav');

  await expect(toggle).toBeVisible();
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-controls', 'primary-nav');

  await toggle.click();
  await expect(nav).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  // Every destination is reachable once open.
  const navCount = await page.evaluate(() => window.SiteChrome.NAV.length);
  await expect(nav.locator('a')).toHaveCount(navCount);
  await expect(nav.locator('a', { hasText: 'Resources' })).toBeVisible();
  await expect(nav.locator('a', { hasText: 'Study Plan' })).toBeVisible();

  await toggle.click();
  await expect(nav).toBeHidden();
});

test('Escape closes the menu and restores focus to the toggle', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/index.html?reset');

  const toggle = page.locator('.nav-toggle');
  await toggle.click();
  await expect(page.locator('#primary-nav')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#primary-nav')).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('a long rank name does not wrap the chip or the brand', async ({ page }) => {
  // Regression: at Lv.3 the rank reads "Contract Tester", which was wide enough
  // to wrap the chip to three lines and push the brand onto two.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html?reset');
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++) {
      window.Progress.recordQuizRun({ category: 'manual', correct: 9, total: 10, elapsedMs: 60000 });
    }
  });
  await page.reload();

  const chip = page.locator('.rpg-chip');
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('Lv.');

  const chipBox = await chip.boundingBox();
  const brandBox = await page.locator('.brand').boundingBox();
  const headerBox = await page.locator('.site-header').boundingBox();

  // Single-line heights: anything taller means it wrapped.
  expect(chipBox.height, 'chip wrapped to multiple lines').toBeLessThan(40);
  expect(brandBox.height, 'brand wrapped to two lines').toBeLessThan(36);
  // And nothing spills out of the bar.
  expect(chipBox.y + chipBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
});

test('the RPG chip stays on the top row when the nav collapses', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/index.html?reset');
  // Seed some progress so the chip renders.
  await page.evaluate(() => {
    window.Progress.recordQuizRun({ category: 'manual', correct: 5, total: 10, elapsedMs: 60000 });
  });
  await page.reload();

  const chip = page.locator('.rpg-chip');
  await expect(chip).toBeVisible();

  const brandBox = await page.locator('.brand').boundingBox();
  const chipBox = await chip.boundingBox();
  // Same row means their vertical centres line up closely.
  const brandMid = brandBox.y + brandBox.height / 2;
  const chipMid = chipBox.y + chipBox.height / 2;
  expect(Math.abs(brandMid - chipMid)).toBeLessThan(24);
});
