// Windows, Tabs & Navigation.
//
// This suite is doubling as the worked example: every test here is written
// the way the lab teaches, so a learner reading it sees the pattern applied
// rather than described. If the lab's advice and this file ever disagree,
// one of them is wrong and it matters which.
const { test, expect } = require('@playwright/test');

const LAB = '/practice-apps/windows-lab.html';

test.describe('new tabs and popups', () => {
  test('a target=_blank link opens a tab and leaves this page alone', async ({ page, context }) => {
    await page.goto(LAB + '?reset');

    // Wait and click TOGETHER. Clicking first is a race.
    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-blank').click(),
    ]);
    await tab.waitForLoadState();

    await expect(tab.getByTestId('target-heading')).toHaveText('Window Target');
    await expect(tab.getByTestId('target-from')).toHaveText('blank-link');

    // The trap the lab names: the original handle never moved.
    await expect(page).toHaveURL(/windows-lab/);
    await tab.close();
  });

  test('window.open produces a popup with its own content', async ({ page }) => {
    await page.goto(LAB + '?reset');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByTestId('open-popup').click(),
    ]);
    await popup.waitForLoadState();
    await expect(popup.getByTestId('target-from')).toHaveText('popup');
    await popup.close();
    expect(popup.isClosed()).toBe(true);
  });

  test('window.open hands over the opener unless noopener is passed', async ({ page, context }) => {
    // The security exercise, corrected against a real browser. The first
    // version used two anchors differing only in rel — and BOTH reported
    // "opener: null", because current browsers imply noopener for
    // target="_blank". The exercise proved nothing and the copy repeated
    // advice that is no longer the live risk.
    await page.goto(LAB + '?reset');

    const [unsafe] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-unsafe').click(),
    ]);
    await unsafe.waitForLoadState();
    await expect(unsafe.getByTestId('opener-state')).toHaveText('opener: reachable');

    const [safe] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-safe').click(),
    ]);
    await safe.waitForLoadState();
    await expect(safe.getByTestId('opener-state')).toHaveText('opener: null');

    await unsafe.close();
    await safe.close();
  });

  test('an anchor is severed by the browser regardless of rel', async ({ page, context }) => {
    // Pins the measurement the exercise now rests on. If a future browser
    // changes this, the lab's copy becomes wrong and this fails first.
    await page.goto(LAB + '?reset');
    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-blank').click(),
    ]);
    await tab.waitForLoadState();
    await expect(tab.getByTestId('opener-state')).toHaveText('opener: null');
    await tab.close();
  });

  test('three tabs are chosen by identity, never by index', async ({ page, context }) => {
    await page.goto(LAB + '?reset');
    await page.getByTestId('open-three').click();
    await expect.poll(() => context.pages().length).toBe(4);

    for (const p of context.pages()) {
      if (p !== page) await p.waitForLoadState();
    }

    const gadget = context.pages().find((p) => p.url().includes('sku=gadget'));
    expect(gadget, 'no tab matched the sku we asked for').toBeTruthy();
    await expect(gadget.getByTestId('target-sku')).toHaveText('gadget');

    for (const p of context.pages()) {
      if (p !== page) await p.close();
    }
  });

  test('a self-closing tab can be read before it goes', async ({ page, context }) => {
    await page.goto(LAB + '?reset');
    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-self-closing').click(),
    ]);
    await tab.waitForLoadState();
    await expect(tab.getByTestId('target-autoclose')).toContainText('yes');

    await tab.waitForEvent('close', { timeout: 5000 });
    expect(tab.isClosed()).toBe(true);
  });
});

test.describe('navigation', () => {
  test('a same-tab navigation changes the URL and Back returns', async ({ page }) => {
    await page.goto(LAB + '?reset');
    await page.getByTestId('go-same-tab').click();
    await page.waitForURL(/window-target/);
    await expect(page.getByTestId('target-from')).toHaveText('same-tab');

    await page.goBack();
    await expect(page).toHaveURL(/windows-lab/);
  });

  test('a redirect lands on the destination, not the hop', async ({ page }) => {
    await page.goto(LAB + '?reset');
    await page.getByTestId('go-redirect').click();

    await page.waitForURL(/window-target/);
    await expect(page.getByTestId('target-from')).toHaveText('redirect');
  });

  test('the redirect hop uses replace, so Back skips it', async ({ page }) => {
    // location.replace() keeps the hop out of history. A test that expected
    // to go Back into the middle page would be asserting the wrong model of
    // how real post-login redirects behave.
    await page.goto(LAB + '?reset');
    await page.getByTestId('go-redirect').click();
    await page.waitForURL(/window-target/);

    await page.goBack();
    await expect(page).toHaveURL(/windows-lab/);
  });

  test('the redirect page does not forward without the flag', async ({ page }) => {
    // Otherwise a sitewide crawl bounces through it, and the smoke suite
    // would be asserting against a page it did not ask for.
    await page.goto('/practice-apps/window-redirect.html?reset');
    await expect(page.getByTestId('redirect-idle')).toBeVisible();
    await expect(page).toHaveURL(/window-redirect/);
  });

  test('pushState moves the URL with no navigation at all', async ({ page }) => {
    await page.goto(LAB + '?reset');

    let navigations = 0;
    page.on('load', () => { navigations++; });

    await page.getByTestId('push-state').click();
    await expect(page).toHaveURL(/step=2/);        // passes...
    await expect(page.getByTestId('spa-view')).toHaveText('Step 2');  // ...and this is the real check

    expect(navigations, 'a document actually loaded — that is not a pushState').toBe(0);
  });

  test('Back after pushState restores the previous view', async ({ page }) => {
    await page.goto(LAB + '?reset');
    await page.getByTestId('push-state').click();
    await expect(page.getByTestId('spa-view')).toHaveText('Step 2');

    await page.goBack();
    await expect(page.getByTestId('spa-view')).toHaveText('Step 1');
  });
});

test.describe('the lab itself', () => {
  test('the pattern is locked until the behavior has been triggered', async ({ page }) => {
    // Handing over the API call before the learner has met the problem is
    // the difference between a lab and a cheat sheet.
    await page.goto(LAB + '?reset');
    await expect(page.getByTestId('reveal-pushstate')).toBeDisabled();
    await expect(page.getByTestId('pattern-pushstate')).toBeHidden();

    await page.getByTestId('push-state').click();
    await expect(page.getByTestId('reveal-pushstate')).toBeEnabled();
    await page.getByTestId('reveal-pushstate').click();
    await expect(page.getByTestId('pattern-pushstate')).toBeVisible();
    await expect(page.getByTestId('pattern-pushstate')).toContainText('toHaveURL');
  });

  test('the score counts what was exercised, and cannot exceed the total', async ({ page }) => {
    await page.goto(LAB + '?reset');
    const total = await page.evaluate(() => window.WINDOW_CHALLENGES.length);
    await expect(page.getByTestId('wl-score')).toHaveText(`0 of ${total} exercised`);

    await page.getByTestId('push-state').click();
    await page.getByTestId('push-state').click();   // twice: still one behavior
    await expect(page.getByTestId('wl-score')).toHaveText(`1 of ${total} exercised`);
  });

  test('every challenge has a control, a trap and a pattern', async ({ page }) => {
    await page.goto(LAB + '?reset');
    const problems = await page.evaluate(() => {
      const out = [];
      window.WINDOW_CHALLENGES.forEach((c) => {
        if (!document.querySelector(`[data-challenge="${c.id}"]`)) out.push(c.id + ': not rendered');
        if (!c.trap || c.trap.length < 60) out.push(c.id + ': trap too thin to be useful');
        if (!c.pattern || !/await/.test(c.pattern)) out.push(c.id + ': pattern is not runnable code');
        if (!c.teaches || c.teaches.length < 60) out.push(c.id + ': no takeaway');
      });
      return out;
    });
    expect(problems).toEqual([]);
  });

  test('the event log has no clock in it', async ({ page }) => {
    // A timestamp in text that gets asserted on makes the assertion
    // nondeterministic, which is the flake this site spends a track warning
    // learners about.
    await page.goto(LAB + '?reset');
    await page.getByTestId('push-state').click();
    const text = await page.getByTestId('event-log').textContent();
    expect(text).toMatch(/pushState/);
    expect(text, 'a timestamp leaked into the log').not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});

test.describe('new tabs in the storefront', () => {
  test('Terms opens in a new tab, safely', async ({ page, context }) => {
    await page.goto('/practice-apps/cart.html?reset');
    const link = page.getByTestId('terms-link');
    await expect(link).toHaveAttribute('rel', /noopener/);

    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      link.click(),
    ]);
    await tab.waitForLoadState();
    await expect(tab.getByTestId('target-from')).toHaveText('terms');
    await expect(page).toHaveURL(/cart\.html/);
    await tab.close();
  });

  test('the invoice opens in a new tab after a real checkout', async ({ page, context }) => {
    await page.goto('/practice-apps/cart.html?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('checkout-btn').click();
    await page.getByTestId('ship-name').fill('Alex Rivera');
    await page.getByTestId('ship-address').fill('14 Mill Lane');
    await page.getByTestId('ship-postcode').fill('EC1A 1BB');
    await page.getByTestId('to-payment').click();
    await page.getByTestId('card-number').fill('4111111111111111');
    await page.getByTestId('place-order').click();

    const invoice = page.getByTestId('view-invoice');
    await expect(invoice).toHaveAttribute('rel', /noopener/);

    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      invoice.click(),
    ]);
    await tab.waitForLoadState();
    await expect(tab.getByTestId('target-from')).toHaveText('invoice');
    await tab.close();
  });
});
