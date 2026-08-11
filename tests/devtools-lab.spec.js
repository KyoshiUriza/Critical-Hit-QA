const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/devtools-lab.html';

test.describe('DevTools Lab', () => {
  test('loads with a clean console — nothing fires until you act', async ({ page }) => {
    // The whole site asserts zero console errors on load. This app deliberately
    // produces one, so it has to be behind a button — which is also the more
    // realistic exercise: open the panel, THEN act.
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(APP + '?reset');
    await expect(page.getByTestId('challenge-console')).toBeVisible();
    expect(errors, 'the page must load clean').toEqual([]);
  });

  test('the console challenge logs a real console error', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(APP + '?reset');
    await page.locator('[data-trigger="console"]').click();

    // Real console.error, not a simulated panel.
    expect(errors.join(' ')).toContain('expired');
    // And the UI still claims success — that contradiction is the exercise.
    await expect(page.getByTestId('coupon-result')).toContainText('Discount applied');
  });

  test('the network challenge produces a genuine 404', async ({ page }) => {
    // connect-src is 'none', so this cannot be a fetch. An <img> at a missing
    // same-origin path is a real request that really 404s.
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status()); });

    await page.goto(APP + '?reset');
    await page.locator('[data-trigger="network"]').click();
    await expect.poll(() => failed.length, { timeout: 5000 }).toBeGreaterThan(0);
    expect(failed).toContain(404);
  });

  test('the storage challenge really writes to localStorage', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.locator('[data-trigger="storage"]').click();

    const stored = await page.evaluate(() => localStorage.getItem('devtools_lab_prefs'));
    expect(stored, 'the key the challenge asks for must actually exist').toBeTruthy();
    expect(JSON.parse(stored)).toHaveProperty('theme');
    // The UI claims a server save; nothing left the browser.
    await expect(page.getByTestId('storage-result')).toContainText('Saved to your account');
  });

  test('the elements challenge hides a present element with opacity, not display', async ({ page }) => {
    // display:none would be a different, easier defect. opacity:0 keeps the
    // element in the layout, focusable and announced — which is the point.
    await page.goto(APP + '?reset');
    await page.locator('[data-trigger="elements"]').click();

    const err = page.getByTestId('dl-email-error');
    await expect(err).toContainText('valid email');

    const style = await err.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, display: cs.display, visibility: cs.visibility };
    });
    expect(style.opacity).toBe('0');
    expect(style.display).not.toBe('none');
    expect(style.visibility).not.toBe('hidden');
  });

  test('a correct answer is accepted and explains why it matters', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.locator('[data-answer="network"]').fill('404 not found');
    await page.locator('[data-check="network"]').click();

    const verdict = page.locator('[data-verdict="network"]');
    await expect(verdict).toContainText('That is what the evidence says');
    await expect(verdict).toContainText('whose fault it is');
    await expect(page.getByTestId('dl-score')).toContainText('1 of 4');
  });

  test('a wrong answer gives the hint, not the answer', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.locator('[data-answer="network"]').fill('500');
    await page.locator('[data-check="network"]').click();

    const verdict = page.locator('[data-verdict="network"]');
    await expect(verdict).toContainText('Not what the panel shows');
    await expect(verdict).toContainText('Status column');
    // The hint must not contain the answer itself.
    expect(await verdict.textContent()).not.toContain('404');
  });

  test('an empty answer asks you to go and look', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.locator('[data-check="console"]').click();
    await expect(page.locator('[data-verdict="console"]')).toContainText('Open the Console panel');
  });

  test('answers are matched loosely enough to allow paraphrasing', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.locator('[data-answer="console"]')
      .fill('The coupon had EXPIRED on 31 July so it was ignored');
    await page.locator('[data-check="console"]').click();
    await expect(page.locator('[data-verdict="console"]')).toContainText('evidence says');
  });

  test('solving records progress', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.locator('[data-answer="storage"]').fill('devtools_lab_prefs');
    await page.locator('[data-check="storage"]').click();

    const runs = await page.evaluate(() => window.Progress.get().quiz.byCategory.manual);
    expect(runs.correct).toBeGreaterThan(0);
  });

  test('every challenge names a panel and has a checkable answer', async ({ page }) => {
    await page.goto(APP + '?reset');
    const problems = await page.evaluate(() => {
      const out = [];
      window.DEVTOOLS_CHALLENGES.forEach((c) => {
        if (!c.panel) out.push(c.id + ': no panel named');
        if (!c.expect || !c.expect.length) out.push(c.id + ': nothing to check against');
        if (!c.teaches || c.teaches.length < 60) out.push(c.id + ': explanation too thin');
        if (!c.hint) out.push(c.id + ': no hint');
        // A hint that contains the answer is not a hint.
        (c.expect || []).forEach((want) => {
          if ((c.hint || '').toLowerCase().includes(String(want).toLowerCase())) {
            out.push(c.id + ': hint gives away the answer');
          }
        });
      });
      return out;
    });
    expect(problems).toEqual([]);
  });
});
