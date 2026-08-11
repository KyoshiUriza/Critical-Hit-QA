// The Responsive Lab's defects are geometry, so they are asserted as geometry.
// Every one of these measures the real box rather than looking for a class
// name — if a refactor makes a defect stop manifesting, the test that proves
// the exercise still works must fail.
const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/responsive-broken.html';
const TRACK = '/pages/learn/responsive.html';

async function setPreset(page, testid) {
  await page.getByTestId(testid).click();
  // Container queries re-evaluate on the next frame.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

test.describe('Responsive Lab — the seeded geometry', () => {
  test('the device frame really resizes, and rotation swaps the axes', async ({ page }) => {
    await page.goto(APP + '?reset');
    const box = async () => (await page.getByTestId('device').boundingBox());

    await setPreset(page, 'preset-phone');
    let b = await box();
    expect(Math.round(b.width)).toBeGreaterThan(370);
    expect(b.height).toBeGreaterThan(b.width);

    await page.getByTestId('rotate').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    b = await box();
    expect(b.width, 'landscape must be wider than tall').toBeGreaterThan(b.height);
    await expect(page.getByTestId('viewport-label')).toContainText('landscape');
  });

  test('reflow: the frame scrolls in two directions at phone width', async ({ page }) => {
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-phone');

    const m = await page.getByTestId('device').evaluate((el) => ({
      scrollW: el.scrollWidth, clientW: el.clientWidth,
      scrollH: el.scrollHeight, clientH: el.clientHeight,
    }));
    expect(m.scrollW, 'WCAG 1.4.10 — content must not need 2D scrolling').toBeGreaterThan(m.clientW);
    expect(m.scrollH, 'it should scroll vertically too, or it is not 2D').toBeGreaterThan(m.clientH);

    // And the summary table is the cause — a learner who inspects should find it.
    const wide = await page.getByTestId('rl-summary').evaluate((el) => el.getBoundingClientRect().width);
    expect(wide).toBeGreaterThan(400);
  });

  test('reflow is gone at desktop width — the defect is responsive, not absolute', async ({ page }) => {
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-desktop');
    const m = await page.getByTestId('device').evaluate((el) => ({ s: el.scrollWidth, c: el.clientWidth }));
    expect(m.s, 'no horizontal overflow on desktop — this is why it shipped').toBeLessThanOrEqual(m.c + 1);
  });

  test('tap targets fall under the 24x24 AA minimum on phones only', async ({ page }) => {
    await page.goto(APP + '?reset');

    await setPreset(page, 'preset-phone');
    const small = await page.getByTestId('rl-remove-0').boundingBox();
    expect(small.width, 'WCAG 2.2 2.5.8 asks for 24 CSS px').toBeLessThan(24);
    expect(small.height).toBeLessThan(24);

    await setPreset(page, 'preset-desktop');
    const big = await page.getByTestId('rl-remove-0').boundingBox();
    expect(big.width, 'the same control is compliant on desktop').toBeGreaterThanOrEqual(44);
  });

  test('the Apply button is present in the DOM but outside its visible row', async ({ page }) => {
    // Present-but-clipped and actually-missing are different defects with
    // different fixes. The exercise only works if it is genuinely the former.
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-small');

    await expect(page.getByTestId('apply-promo')).toBeAttached();
    const out = await page.evaluate(() => {
      const row = document.querySelector('.rl-promo');
      const btn = document.querySelector('[data-testid="apply-promo"]');
      return {
        overflows: row.scrollWidth > row.clientWidth,
        btnRight: btn.getBoundingClientRect().right,
        rowRight: row.getBoundingClientRect().right,
      };
    });
    expect(out.overflows, 'the row must scroll inside itself').toBe(true);
    expect(out.btnRight, 'Apply should sit past the visible edge').toBeGreaterThan(out.rowRight);
  });

  test('the sticky header takes nearly half the viewport in landscape', async ({ page }) => {
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-phone');

    const share = async () => page.evaluate(() => {
      const d = document.querySelector('[data-testid="device"]');
      const h = document.querySelector('[data-testid="rl-header"]');
      return h.getBoundingClientRect().height / d.getBoundingClientRect().height;
    });

    const portrait = await share();
    expect(portrait, "portrait is fine, which is why nobody caught it").toBeLessThan(0.30);

    await page.getByTestId('rotate').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await share(), "landscape should give nearly half the screen to chrome").toBeGreaterThan(0.45);
  });

  test('rotating wipes what you typed', async ({ page }) => {
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-phone');

    await page.getByTestId('rl-name').fill('Priya Raman');
    await page.getByTestId('rl-address').fill('14 Mill Lane');
    await page.getByTestId('rotate').click();

    await expect(page.getByTestId('rl-name')).toHaveValue('');
    await expect(page.getByTestId('rl-address')).toHaveValue('');
  });
});

test.describe('Responsive Lab — honest auto-detection', () => {
  const finds = (page) => page.evaluate(() => window.Progress.getBugBountyFinds('responsive') || []);

  test('choosing a phone preset reveals nothing on its own', async ({ page }) => {
    // Ticking layout defects the moment a width is selected would hand over
    // the answers for pressing a button. Nothing here is earned by resizing.
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-small');
    expect(await finds(page)).toEqual([]);
  });

  test('rotating an empty form is not evidence of the data-loss defect', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('rotate').click();
    expect(await finds(page), 'nothing was lost, so nothing was found').toEqual([]);
  });

  test('scrolling the frame sideways records the reflow defect', async ({ page }) => {
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-phone');
    await page.getByTestId('device').evaluate((el) => { el.scrollLeft = 60; });
    await expect.poll(() => finds(page)).toContain('reflow-2d');
  });

  test('scrolling the promo row records the hidden control', async ({ page }) => {
    await page.goto(APP + '?reset');
    await setPreset(page, 'preset-phone');
    await page.evaluate(() => { document.querySelector('.rl-promo').scrollLeft = 200; });
    await expect.poll(() => finds(page)).toContain('clipped-cta');
  });

  test('typing then rotating records the data loss, and only that', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('rl-name').fill('Priya Raman');
    await page.getByTestId('rotate').click();

    await expect.poll(() => finds(page)).toContain('rotate-wipes-form');
    // The two visual-only defects stay unfound — they have no such moment.
    const found = await finds(page);
    expect(found).not.toContain('tap-target');
    expect(found).not.toContain('header-eats-viewport');
  });

  test('every auto-triggered id exists in the catalogue', async ({ page }) => {
    // Detector refuses unknown ids silently, so a typo would make a defect
    // permanently unfindable rather than throwing.
    await page.goto(APP + '?reset');
    const known = await page.evaluate(() =>
      window.APP_DEFECTS.responsive.defects.map((d) => d.id)
    );
    const src = await (await page.request.get(APP)).text();
    const triggered = [...src.matchAll(/trigger\("([a-z0-9-]+)"\)/g)].map((m) => m[1]);
    expect(triggered.length, 'the app should auto-detect something').toBeGreaterThan(0);
    expect(known).toEqual(expect.arrayContaining(triggered));
  });
});

test.describe('Responsive Learn track', () => {
  test('is linked from the Learn hub and reaches the lab', async ({ page }) => {
    await page.goto('/pages/learn.html?reset');
    await page.locator('a.feature-card[href="learn/responsive.html"]').click();
    await expect(page.locator('h1')).toHaveText('Mobile & Responsive Testing');
    await page.locator('a[href="../../practice-apps/responsive-broken.html"]').first().click();
    await expect(page.locator('h1')).toContainText('Responsive Lab');
  });

  test('quotes the seeded count the catalogue actually holds', async ({ page }) => {
    await page.goto('/pages/bug-bounty.html?reset');
    const n = await page.evaluate(() => window.APP_DEFECTS.responsive.defects.length);
    const WORDS = { 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven' };
    expect(WORDS[n], `no spelling for ${n} — extend this map`).toBeTruthy();

    await page.goto(TRACK + '?reset');
    expect(await page.locator('#practice').textContent()).toContain(`${WORDS[n]} defects are seeded`);
  });

  test('states the reflow floor and the tap-target minimum correctly', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const text = await page.locator('main').textContent();
    expect(text, 'WCAG 1.4.10 is written against 320px').toContain('320px');
    expect(text, '2.5.8 Target Size (Minimum) is 24x24 at AA').toMatch(/24×24|24x24/);
    expect(text).toContain('1.4.10');
    expect(text).toContain('2.5.8');
    // And it must not claim 44px is the AA requirement — that is AAA/platform.
    expect(text).toMatch(/44pt|44×44|44x44/);
  });

  test('every internal link on the track resolves', async ({ page }) => {
    await page.goto(TRACK + '?reset');
    const hrefs = await page.locator('main a[href]').evaluateAll((as) =>
      as.map((a) => a.href).filter((h) => h.startsWith('http://localhost') && !h.includes('#'))
    );
    for (const href of [...new Set(hrefs)]) {
      const resp = await page.request.get(href);
      expect(resp.status(), `${href} is a broken cross-link`).toBe(200);
    }
  });
});
