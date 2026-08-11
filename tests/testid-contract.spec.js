// The test-id contract.
//
// The practice apps are being rebuilt to look and behave like real products.
// That is a large amount of markup churn across files whose selectors this
// suite — and any learner's own suite written against them — depends on.
//
// tests/fixtures/testid-inventory.json is the set of data-testid values each
// page RENDERED before that rebuild started. Every one of them must still be
// there. Adding is free; removing or renaming one breaks a promise the README
// makes ("data-testid on every interactive element ... automation-first by
// design") and silently breaks work a learner has already written.
//
// Captured from a real browser rather than by grepping the source. The first
// attempt grepped, and recorded literal template text like `add-${p.id}` from
// apps that build their markup in JS — 430 strings, some of them not ids at
// all, and blind to every id created at runtime. The browser sees 770 real
// ones. A contract test that checks the wrong thing is worse than none.
//
// To retire an id deliberately, delete it from the fixture in the same commit
// and say why in the message. The fixture is the record of the decision.
const { test, expect } = require('@playwright/test');

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'testid-inventory.json'), 'utf8')
);

test.describe('data-testid contract', () => {
  for (const [page_, expected] of Object.entries(INVENTORY)) {
    test(`${page_} still exposes every test id it used to`, async ({ page }) => {
      await page.goto('/' + page_ + '?reset');
      const actual = new Set(await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'))
      ));
      const lost = expected.filter((id) => !actual.has(id));
      expect(lost, `${page_} dropped test ids`).toEqual([]);
    });
  }

  test('ids that only appear after interaction are still there', async ({ page }) => {
    // A basket line's controls do not exist until something is in the basket,
    // so a page-load snapshot cannot see them. These are the ids the suite —
    // and any learner automating the cart — leans on hardest.
    const SHARED = ['cart-line-widget', 'dec-widget', 'inc-widget', 'qty-widget',
      'subtotal', 'tax', 'shipping', 'total'];
    const PER_APP = {
      // The buggy build has never had a Remove button — decrementing is the
      // only way out of the basket, which is half of what makes its
      // negative-quantity defect a trap.
      '/practice-apps/cart.html': SHARED.concat(['remove-widget']),
      '/practice-apps/cart-broken.html': SHARED,
    };
    for (const [app, ids] of Object.entries(PER_APP)) {
      await page.goto(app + '?reset');
      await page.getByTestId('add-widget').click();
      for (const id of ids) {
        await expect(page.getByTestId(id), `${app}: ${id}`).toHaveCount(1);
      }
      await page.getByTestId('coupon-input').fill('SAVE10');
      await page.getByTestId('apply-coupon').click();
      await expect(page.getByTestId('discount'), `${app}: discount`).toHaveCount(1);
    }
  });

  test('the inventory covers every practice app', () => {
    // A new app that never enters the inventory is a new app with no contract.
    const apps = fs.readdirSync(path.join(ROOT, 'practice-apps'))
      .filter((f) => f.endsWith('.html') && f !== 'frame-content.html');
    const covered = Object.keys(INVENTORY).filter((k) => k.startsWith('practice-apps/'))
      .map((k) => k.replace('practice-apps/', ''));
    expect(apps.filter((a) => !covered.includes(a)), 'apps missing from the id inventory').toEqual([]);
  });
});
