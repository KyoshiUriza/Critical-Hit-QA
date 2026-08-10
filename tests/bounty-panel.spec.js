const { test, expect } = require('@playwright/test');

const BUGGY = '/practice-apps/cart-broken.html';
const CLEAN = '/practice-apps/cart.html';

test.describe('Bug Bounty side panel', () => {
  test('mounts on buggy apps and NOT on clean ones', async ({ page }) => {
    await page.goto(BUGGY + '?reset');
    await expect(page.getByTestId('bounty-toggle')).toBeVisible();

    // The clean app has no seeded defects, so a bounty checklist there would
    // invite people to hunt bugs that do not exist.
    await page.goto(CLEAN + '?reset');
    await expect(page.getByTestId('bounty-toggle')).toHaveCount(0);
  });

  test('opens, closes, and manages focus and ARIA state', async ({ page }) => {
    await page.goto(BUGGY + '?reset');
    const toggle = page.getByTestId('bounty-toggle');
    const panel = page.getByTestId('bounty-panel');

    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // Focus lands in the panel so a keyboard user is where their action took them.
    await expect(page.locator('.bounty-panel-title')).toBeFocused();

    // Esc closes and returns focus to the toggle.
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('ticking a defect in the panel is the same store the Bug Bounty page reads', async ({ page }) => {
    await page.goto(BUGGY + '?reset');
    await page.getByTestId('bounty-toggle').click();

    const first = page.locator('.bounty-item input[type="checkbox"]').first();
    const defectId = await first.getAttribute('data-defect');
    await first.check();

    // The count on the toggle updates...
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('bounty-count')).toContainText('1/');

    // ...and the full Bug Bounty page agrees, because it is the same store.
    await page.goto('/pages/bug-bounty.html');
    const box = page.locator(`input[data-defect="${defectId}"]`);
    await expect(box).toBeChecked();
  });

  test('titles stay hidden until ticked — no spoilers', async ({ page }) => {
    await page.goto(BUGGY + '?reset');
    await page.getByTestId('bounty-toggle').click();

    const firstTitle = page.locator('.bounty-item-title').first();
    await expect(firstTitle).toHaveText('Hidden — tick when you find it');

    await page.locator('.bounty-item input[type="checkbox"]').first().check();
    await expect(page.locator('.bounty-item-title').first()).not.toHaveText('Hidden — tick when you find it');
    // A revealed find gains its repro hint and a write-up link into the builder.
    await expect(page.locator('.bounty-item').first()).toContainText('Reproduces via:');
    await expect(page.getByTestId('panel-write-up').first()).toHaveAttribute(
      'href', /pages\/bug-report-builder\.html\?app=cart&defect=/
    );
  });

  test('finds made on the Bug Bounty page appear in the panel', async ({ page }) => {
    // Sync must hold in both directions; the panel renders from the store on
    // load, not from its own copy.
    await page.goto(BUGGY + '?reset');
    await page.evaluate(() => {
      const all = window.APP_DEFECTS.cart.defects.map((d) => d.id);
      window.Progress.setBugBountyFinds('cart', [all[0]]);
    });
    await page.goto(BUGGY);
    await expect(page.getByTestId('bounty-count')).toContainText('1/');
    await page.getByTestId('bounty-toggle').click();
    await expect(page.locator('.bounty-item.found')).toHaveCount(1);
  });

  test('open state survives a reload mid-hunt', async ({ page }) => {
    // Broken apps get refreshed constantly during a session; the drawer
    // reopening itself is the difference between a tool and a nuisance.
    await page.goto(BUGGY + '?reset');
    await page.getByTestId('bounty-toggle').click();
    await expect(page.getByTestId('bounty-panel')).toBeVisible();

    await page.goto(BUGGY); // NOT reload() — ?reset would wipe the state
    await expect(page.getByTestId('bounty-panel')).toBeVisible();
  });

  test('the panel does not cause horizontal overflow, open or closed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BUGGY + '?reset');
    const overflows = () => page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(await overflows(), 'closed').toBe(false);
    await page.getByTestId('bounty-toggle').click();
    expect(await overflows(), 'open').toBe(false);
  });

  test('works at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BUGGY + '?reset');
    await page.getByTestId('bounty-toggle').click();
    const panel = page.getByTestId('bounty-panel');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box.width).toBeLessThanOrEqual(375);
    // The close button must remain reachable.
    await page.getByTestId('bounty-close').click();
    await expect(panel).toBeHidden();
  });
});
