// Northwind Outfitters — the storefront both cart builds share.
//
// The point of the rebuild is that the practice apps should look and flow
// like products a tester actually gets handed. That adds a lot of new
// surface: chrome, filters, sorting, stock states, and a four-step checkout.
// New surface with no tests is just a bigger place for defects to hide, so
// this covers the flow, and it covers the thing that makes the pair useful —
// that the two builds are identical except for the seeded defects.
const { test, expect } = require('@playwright/test');

const CLEAN = '/practice-apps/cart.html';
const BUGGY = '/practice-apps/cart-broken.html';

async function checkout(page) {
  await page.getByTestId('checkout-btn').click();
  await page.getByTestId('ship-name').fill('Alex Rivera');
  await page.getByTestId('ship-address').fill('14 Mill Lane');
  await page.getByTestId('ship-postcode').fill('EC1A 1BB');
  await page.getByTestId('to-payment').click();
  await page.getByTestId('card-number').fill('4111111111111111');
  await page.getByTestId('place-order').click();
}

test.describe('product chrome', () => {
  test('the app has its own brand, nav, search and basket badge', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await expect(page.getByTestId('app-brand')).toContainText('Northwind Outfitters');
    await expect(page.getByTestId('app-topbar')).toBeVisible();
    await expect(page.getByTestId('app-crumbs')).toContainText('Shop');
    await expect(page.getByTestId('app-search')).toBeVisible();
    await expect(page.getByTestId('app-cart-count')).toHaveAttribute('data-count', '0');
  });

  test('the basket badge tracks quantity, not lines', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('add-widget').click();
    await page.getByTestId('add-gadget').click();
    await expect(page.getByTestId('app-cart-count')).toHaveAttribute('data-count', '3');
  });

  test('the study-site header is still present and separate from the app header', async ({ page }) => {
    // The practice app pretends to be a product; the page around it is still
    // this site. Losing that distinction would strand a learner inside a fake
    // storefront with no way back.
    await page.goto(CLEAN + '?reset');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.site-header .rpg-chip')).toBeVisible();
    await expect(page.locator('.app-shell .app-topbar')).toBeVisible();
  });

  test('adding something confirms it, the way a real store does', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-gadget').click();
    const toast = page.getByTestId('app-toast');
    await expect(toast).toContainText('Gadget added');
    await expect(toast).toHaveAttribute('role', 'status');
  });
});

test.describe('catalogue', () => {
  test('the four original SKUs keep their ids and prices', async ({ page }) => {
    // Load-bearing: the regression suite and any learner's own tests add
    // Widget twice and Gadget once and expect $45.00.
    await page.goto(CLEAN + '?reset');
    await expect(page.getByTestId('price-widget')).toHaveText('$10.00');
    await expect(page.getByTestId('price-gadget')).toHaveText('$25.00');
    await expect(page.getByTestId('price-gizmo')).toHaveText('$5.99');
    await expect(page.getByTestId('price-doohickey')).toHaveText('$99.99');
  });

  test('filtering by category narrows the grid and updates the count', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    const all = await page.locator('.prod-card').count();
    await page.getByTestId('filter-apparel').check();
    const some = await page.locator('.prod-card').count();
    expect(some).toBeGreaterThan(0);
    expect(some).toBeLessThan(all);
    await expect(page.getByTestId('result-count')).toContainText(`${some} of ${all}`);
  });

  test('an out-of-stock product says so and cannot be added', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await expect(page.getByTestId('stock-trail-cap')).toHaveText('Out of stock');
    await expect(page.getByTestId('add-trail-cap')).toBeDisabled();
    await expect(page.getByTestId('app-cart-count')).toHaveAttribute('data-count', '0');
  });

  test('sorting by price is numeric, not lexicographic', async ({ page }) => {
    // $10.00 before $5.99 would be the string-sort defect the Scheduler
    // teaches. The reference build must not contain it.
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('sort-by').selectOption('price-asc');
    const prices = await page.locator('.prod-card .prod-price > [data-testid^="price-"]')
      .evaluateAll((els) => els.map((e) => Number(e.textContent.replace('$', ''))));
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  test('filters that match nothing show an empty state, not a blank grid', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('app-search').fill('nothing matches this');
    await expect(page.getByTestId('no-results')).toBeVisible();
    await expect(page.locator('.prod-card')).toHaveCount(0);
  });

  test('the empty basket has an empty state', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await expect(page.getByTestId('empty-cart')).toBeVisible();
    await page.getByTestId('add-widget').click();
    await expect(page.getByTestId('empty-cart')).toHaveCount(0);
    await page.getByTestId('remove-widget').click();
    await expect(page.getByTestId('empty-cart')).toBeVisible();
  });
});

test.describe('checkout flow', () => {
  test('an empty basket cannot enter checkout', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('checkout-btn').click();
    await expect(page.getByTestId('checkout-result')).toContainText('Cart is empty');
    await expect(page.getByTestId('pane-basket')).toBeVisible();
  });

  test('the step indicator marks exactly one current step and the ones behind it', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
    await expect(page.getByTestId('step-basket')).toHaveAttribute('aria-current', 'step');

    await page.getByTestId('checkout-btn').click();
    await expect(page.getByTestId('step-delivery')).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId('step-basket')).toHaveAttribute('data-done', 'true');
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  });

  test('delivery will not continue with fields empty', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('checkout-btn').click();
    await page.getByTestId('to-payment').click();
    await expect(page.getByTestId('delivery-error')).toContainText('every delivery field');
    await expect(page.getByTestId('pane-delivery')).toBeVisible();
  });

  test('payment rejects a card number outside 12-19 digits', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('checkout-btn').click();
    await page.getByTestId('ship-name').fill('Alex Rivera');
    await page.getByTestId('ship-address').fill('14 Mill Lane');
    await page.getByTestId('ship-postcode').fill('EC1A 1BB');
    await page.getByTestId('to-payment').click();

    await page.getByTestId('card-number').fill('411');
    await page.getByTestId('place-order').click();
    await expect(page.getByTestId('payment-error')).toContainText('12 and 19 digits');
    await expect(page.getByTestId('pane-payment')).toBeVisible();
  });

  test('you can go back, change the basket, and come forward again', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('checkout-btn').click();
    await page.getByTestId('back-to-basket').click();
    await expect(page.getByTestId('pane-basket')).toBeVisible();

    await page.getByTestId('add-gadget').click();
    await expect(page.getByTestId('subtotal')).toHaveText('$35.00');
    await page.getByTestId('checkout-btn').click();
    await expect(page.getByTestId('pane-delivery')).toBeVisible();
  });

  test('placing an order confirms with a reference and empties the basket', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await checkout(page);

    await expect(page.getByTestId('pane-done')).toBeVisible();
    await expect(page.getByTestId('order-ref')).toContainText(/NW-\d+/);
    await expect(page.getByTestId('app-cart-count')).toHaveAttribute('data-count', '0');

    await page.getByTestId('keep-shopping').click();
    await expect(page.getByTestId('empty-cart')).toBeVisible();
  });

  test('a second order does not inherit the first order\'s discount', async ({ page }) => {
    await page.goto(CLEAN + '?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();
    await checkout(page);
    await page.getByTestId('keep-shopping').click();

    await page.getByTestId('add-widget').click();
    await expect(page.getByTestId('discount')).toHaveCount(0);
    await expect(page.getByTestId('total')).toHaveText('$16.79');  // 10 + 0.80 tax + 5.99 ship
  });
});

test.describe('the two builds differ only in the defects', () => {
  test('both builds render the same structure', async ({ page }) => {
    // If the buggy build drifts into looking different, a learner comparing
    // them starts comparing layout instead of behaviour, which is the whole
    // reason the pair exists.
    const shape = async (url) => {
      await page.goto(url + '?reset');
      return page.evaluate(() =>
        [...document.querySelectorAll('.app-shell [data-testid]')]
          .map((e) => e.getAttribute('data-testid')).sort()
      );
    };
    const clean = await shape(CLEAN);
    const buggy = await shape(BUGGY);
    expect(buggy).toEqual(clean);
  });

  test('the same actions give different money — that is the exercise', async ({ page }) => {
    const taxAfterCoupon = async (url) => {
      await page.goto(url + '?reset');
      await page.getByTestId('add-widget').click();
      await page.getByTestId('add-widget').click();
      await page.getByTestId('add-gadget').click();
      await page.getByTestId('coupon-input').fill('SAVE10');
      await page.getByTestId('apply-coupon').click();
      return page.getByTestId('tax').textContent();
    };
    expect(await taxAfterCoupon(CLEAN)).toBe('$3.24');   // 8% of $40.50
    expect(await taxAfterCoupon(BUGGY)).toBe('$3.60');   // 8% of the raw $45
    // And the rounding defect is scoped: tax stays clean, the line total does not.
  });

  test('every seeded cart defect is still reachable in the rebuilt storefront', async ({ page }) => {
    const finds = () => page.evaluate(() => window.Progress.getBugBountyFinds('cart') || []);
    await page.goto(BUGGY + '?reset');

    // tax-basis
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();
    // coupon-case
    await page.getByTestId('coupon-input').fill('save10');
    await page.getByTestId('apply-coupon').click();
    // negative-qty
    await page.getByTestId('dec-widget').click();
    // money-rounding. The answer key and the Bug Bounty hint both said 3 x
    // Gizmo renders 17.970000000000002. It does not: 5.99 * 3 is exactly
    // 17.97, so the documented reproduction never worked and anyone following
    // it concluded the defect was not there. 5 x does produce residue.
    for (let i = 0; i < 5; i++) await page.getByTestId('add-gizmo').click();
    await expect(page.getByTestId('line-gizmo')).toHaveText('$29.950000000000003');
    await expect(page.getByTestId('subtotal'), 'only the line total skips the formatter')
      .toHaveText('$29.95');

    // shipping-basis needs the basket ABOVE $50 raw and BELOW it discounted.
    // An earlier version of this test used a $117.96 basket, which is still
    // over the threshold after HALFOFF, so the defect never fired and the
    // test was quietly asserting less than it claimed.
    await page.getByTestId('inc-widget').click();
    await page.getByTestId('inc-widget').click();
    await page.getByTestId('inc-widget').click();
    await page.getByTestId('add-gadget').click();
    await page.getByTestId('coupon-input').fill('HALFOFF');
    await page.getByTestId('apply-coupon').click();
    await expect(page.getByTestId('shipping')).toHaveText('FREE');

    await expect.poll(finds).toEqual(
      expect.arrayContaining(['tax-basis', 'coupon-case', 'negative-qty', 'shipping-basis', 'money-rounding'])
    );
  });

  test('the buggy build lets an empty basket through checkout', async ({ page }) => {
    await page.goto(BUGGY + '?reset');
    await checkout(page);
    await expect(page.getByTestId('pane-done')).toBeVisible();
    await expect(page.getByTestId('confirmation')).toContainText('Order placed');

    const finds = await page.evaluate(() => window.Progress.getBugBountyFinds('cart') || []);
    expect(finds).toContain('empty-checkout');
  });

  test('the buggy build carries the coupon into the next order', async ({ page }) => {
    await page.goto(BUGGY + '?reset');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();
    await checkout(page);
    await page.getByTestId('keep-shopping').click();

    await page.getByTestId('add-widget').click();
    // The input was cleared; the discount was not.
    await expect(page.getByTestId('coupon-input')).toHaveValue('');
    await expect(page.getByTestId('discount')).toHaveCount(1);

    const finds = await page.evaluate(() => window.Progress.getBugBountyFinds('cart') || []);
    expect(finds).toContain('coupon-persists');
  });
});

// ── Auth pages ────────────────────────────────────────────────────────
// The sign-in and sign-up forms are unchanged; what is new is the product
// around them. That chrome is testable surface, not decoration, so it is
// tested — including the part that matters most, that wrapping the form did
// not disturb the form.
test.describe('Northwind Account', () => {
  const AUTH = [
    '/practice-apps/login.html',
    '/practice-apps/login-broken.html',
    '/practice-apps/register.html',
    '/practice-apps/register-broken.html',
  ];

  for (const url of AUTH) {
    test(`${url} carries sign-in chrome`, async ({ page }) => {
      await page.goto(url + '?reset');
      await expect(page.getByTestId('app-brand')).toContainText('Northwind');
      await expect(page.getByTestId('app-crumbs')).toBeVisible();
      await expect(page.getByTestId('app-help-link')).toBeVisible();
      await expect(page.getByTestId('sso-google')).toBeVisible();
      await expect(page.getByTestId('sso-apple')).toBeVisible();

      // A sign-in page does not show product nav to someone not signed in.
      await expect(page.locator('.app-nav a')).toHaveCount(0);
    });
  }

  test('the login form still works exactly as before', async ({ page }) => {
    // The whole risk of the rebuild in one test: new markup around a form
    // whose behaviour must not have moved.
    await page.goto('/practice-apps/login.html?reset');
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('Passw0rd!');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-result')).toContainText(/welcome/i);
  });

  test('the show/hide password toggle still works', async ({ page }) => {
    await page.goto('/practice-apps/login.html?reset');
    const pw = page.getByTestId('login-password');
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByTestId('toggle-password').click();
    await expect(pw).toHaveAttribute('type', 'text');
    await page.getByTestId('toggle-password').click();
    await expect(pw).toHaveAttribute('type', 'password');
  });

  test('sign-in and sign-up link to each other', async ({ page }) => {
    await page.goto('/practice-apps/login.html?reset');
    await page.getByTestId('go-register').click();
    await expect(page).toHaveURL(/register\.html/);
    await page.getByTestId('go-login').click();
    await expect(page).toHaveURL(/login\.html/);
  });

  test('inert controls are marked as inert rather than looking broken', async ({ page }) => {
    // A link that goes nowhere is a defect unless it is deliberately a
    // placeholder. Marking them means a learner inspecting one can tell the
    // difference, and it keeps us honest about what is real here.
    await page.goto('/practice-apps/login.html?reset');
    const inert = await page.locator('[data-inert-nav="true"]').count();
    expect(inert).toBeGreaterThan(0);
    await expect(page.getByTestId('forgot-password')).toHaveAttribute('data-inert-nav', 'true');
    // The links that DO go somewhere must not be marked inert.
    await expect(page.getByTestId('go-register')).not.toHaveAttribute('data-inert-nav', 'true');
  });
});

// ── Tasklane ──────────────────────────────────────────────────────────
test.describe('Tasklane', () => {
  for (const url of ['/practice-apps/todo.html', '/practice-apps/todo-broken.html']) {
    test(`${url} is a different product, not a restyled storefront`, async ({ page }) => {
      // Two apps that look like the same product teach that all software
      // looks alike. The brand, the accent and the nav all differ.
      await page.goto(url + '?reset');
      await expect(page.getByTestId('app-brand')).toContainText('Tasklane');
      await expect(page.getByTestId('board-personal')).toBeVisible();
      await expect(page.getByTestId('app-cart-count')).toHaveCount(0);

      const accent = await page.locator('.app-shell').evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--app-accent').trim());
      expect(accent).toBe('#5b5bd6');
    });
  }

  test('the todo behaviour is untouched by the new chrome', async ({ page }) => {
    await page.goto('/practice-apps/todo.html?reset');
    await page.getByTestId('new-todo-input').fill('Write the test plan');
    await page.getByTestId('add-todo').click();
    await expect(page.getByTestId('todo-list').locator('li')).toHaveCount(1);
    await expect(page.getByTestId('items-left')).toContainText('1 item');

    // The empty state is itself an <li>, so counting bare list items would
    // never reach zero. Count real todos instead.
    const todos = page.getByTestId('todo-list').locator('li.todo-item');
    await page.getByTestId('filter-done').click();
    await expect(todos).toHaveCount(0);
    await expect(page.getByTestId('todo-list')).toContainText('No items');
    await page.getByTestId('filter-all').click();
    await expect(todos).toHaveCount(1);
  });
});

// ── Every app is its own product ──────────────────────────────────────
test.describe('the apps do not converge into one product', () => {
  const BRANDED = {
    '/practice-apps/cart.html': ['Northwind Outfitters', '#2f7d5a'],
    '/practice-apps/login.html': ['Northwind Outfitters', '#2f7d5a'],
    '/practice-apps/todo.html': ['Tasklane', '#5b5bd6'],
    '/practice-apps/bank.html': ['Meridian Bank', '#1f5f9e'],
    '/practice-apps/scheduler-broken.html': ['Cadence Calendar', '#8a4b1f'],
    '/practice-apps/live-feed-broken.html': ['Pulse Ops Feed', '#8f2f52'],
  };

  for (const [url, [name, accent]] of Object.entries(BRANDED)) {
    test(`${url} presents as ${name}`, async ({ page }) => {
      await page.goto(url + '?reset');
      await expect(page.getByTestId('app-brand')).toContainText(name);
      const got = await page.locator('.app-shell').first().evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--app-accent').trim());
      expect(got).toBe(accent);
    });
  }

  test('every brand accent clears 4.5:1 against its own foreground', async ({ page }) => {
    // The strip and brand mark paint accent-coloured backgrounds with text on
    // top. The contrast sweep covers the pages that are in it; this covers
    // every brand in the registry, including ones no page uses yet.
    await page.goto('/practice-apps/cart.html?reset');
    const bad = await page.evaluate(() => {
      const lum = (hex) => {
        const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255)
          .map((s) => (s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => {
        const x = lum(a), y = lum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      return Object.entries(window.AppShell.BRANDS)
        .map(([k, b]) => [k, ratio(b.accent, b.onAccent)])
        .filter(([, r]) => r < 4.5)
        .map(([k, r]) => `${k}: ${r.toFixed(2)}:1`);
    });
    expect(bad).toEqual([]);
  });

  test('the shell never swallows the site chrome', async ({ page }) => {
    for (const url of Object.keys(BRANDED)) {
      await page.goto(url + '?reset');
      await expect(page.locator('.site-header'), url).toBeVisible();
      await expect(page.locator('.site-footer'), url).toBeVisible();
      await expect(page.locator('.skip-link'), url).toHaveAttribute('href', '#main');
    }
  });
});
