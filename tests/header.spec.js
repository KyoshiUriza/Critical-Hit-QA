// Header layout regression suite.
//
// The bug: .header-inner had a fixed height:60px while .nav was flex-wrap:wrap.
// With 10 nav items the nav needed ~84px, so "Study Plan" and "Resources"
// rendered *outside* the header box on any viewport under ~1200px.
const { test, expect } = require('@playwright/test');

// 1295/1294 straddle the collapse breakpoint, and 1296 sits just inside the
// window where the full nav must fit unaided. Sampling round numbers only is
// how an added nav item once shipped a horizontal overflow in a narrow band
// that every other width passed straight over.
//
// The breakpoint has moved twice (1220 -> 1240 -> 1295), so these three
// numbers are expected to change with it. What must not change is that all
// three are present.
const WIDTHS = [1440, 1280, 1252, 1251, 1250, 1249, 1200, 1100, 1024, 900, 768, 600, 414, 375];

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

  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    // Setting flex-shrink:0 to stop the chip wrapping converted the problem
    // into sideways overflow — invisible to the vertical-escape check above.
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html?reset');
    // Seed progress so the RPG chip renders at a realistic width.
    await page.evaluate(() => {
      for (let i = 0; i < 6; i++) {
        window.Progress.recordQuizRun({ category: 'manual', correct: 9, total: 10, elapsedMs: 1000 });
      }
    });
    await page.reload();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const inner = document.querySelector('.header-inner');
      const right = inner.getBoundingClientRect().right;
      const strays = [...inner.children]
        .filter((el) => el.getClientRects().length && el.getBoundingClientRect().right > right + 1)
        .map((el) => el.className || el.tagName);
      return {
        pageScrolls: doc.scrollWidth > doc.clientWidth,
        strays,
      };
    });

    expect(overflow.pageScrolls, `page scrolls horizontally at ${width}px`).toBe(false);
    expect(overflow.strays, `header children overflow the bar at ${width}px`).toEqual([]);
  });
}

test('wide viewports show the full nav and hide the toggle', async ({ page }) => {
  // Above the measured 1250px breakpoint.
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

  // Compare against each element's own line-height rather than a hardcoded
  // pixel count — absolute thresholds encode Windows font metrics and would
  // be flaky on the Linux CI runner.
  const wrapped = await page.evaluate(() => {
    const check = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      if (Number.isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.2;
      // More than ~1.6 line-boxes tall means it wrapped.
      return el.getBoundingClientRect().height > lh * 1.6;
    };
    return { chip: check('.rpg-chip'), brand: check('.brand') };
  });
  expect(wrapped.chip, 'chip wrapped to multiple lines').toBe(false);
  expect(wrapped.brand, 'brand wrapped to two lines').toBe(false);
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
