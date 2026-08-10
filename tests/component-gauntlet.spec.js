const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/component-gauntlet.html';

// Each test doubles as the worked answer for its exercise: this is what the
// technique looks like when done properly, and the file is readable source on
// a public repo.

test.describe('Component Gauntlet', () => {
  test('form controls report their selections', async ({ page }) => {
    await page.goto(APP + '?reset');

    await page.getByTestId('radio-pro').check();
    await expect(page.getByTestId('radio-output')).toHaveText('Selected: pro');

    await page.getByTestId('dropdown').selectOption('critical');
    await expect(page.getByTestId('dropdown-output')).toHaveText('Severity: critical');

    await page.getByTestId('multiselect').selectOption(['chromium', 'webkit']);
    await expect(page.getByTestId('multiselect-output')).toHaveText('Selected: chromium, webkit');
  });

  test('select-all drives an indeterminate state, not just checked', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('check-a').check();

    // The trap: `checked` is false while some-but-not-all are ticked, so a
    // test asserting only on checked reports "nothing selected".
    const state = await page.getByTestId('check-all').evaluate(
      (el) => ({ checked: el.checked, indeterminate: el.indeterminate })
    );
    expect(state).toEqual({ checked: false, indeterminate: true });

    await page.getByTestId('check-all').check();
    await expect(page.getByTestId('check-output')).toHaveText('3 selected');
  });

  test('autosuggest filters and selects', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('autosuggest-input').fill('in');
    await expect(page.getByTestId('suggestions')).toBeVisible();
    await page.getByTestId('suggestion-india').click();
    await expect(page.getByTestId('autosuggest-output')).toHaveText('Chosen: India');
    await expect(page.getByTestId('suggestions')).toBeHidden();
  });

  test('native dialogs need a handler registered before the click', async ({ page }) => {
    await page.goto(APP + '?reset');

    page.once('dialog', (d) => d.accept());
    await page.getByTestId('alert-btn').click();
    await expect(page.getByTestId('dialog-output')).toHaveText('Alert accepted');

    page.once('dialog', (d) => d.dismiss());
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByTestId('dialog-output')).toHaveText('Dismissed');

    page.once('dialog', (d) => d.accept('T-042'));
    await page.getByTestId('prompt-btn').click();
    await expect(page.getByTestId('dialog-output')).toHaveText('Prompt value: T-042');
  });

  test('popup window is captured by waiting before the click', async ({ page, context }) => {
    await page.goto(APP + '?reset');
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-window').click(),
    ]);
    await popup.waitForLoadState();
    await expect(popup.getByTestId('frame-button')).toBeVisible();
    await popup.close();
  });

  test('iframe content is reachable only through the frame', async ({ page }) => {
    await page.goto(APP + '?reset');

    // Proves the frame is a separate context: the control does not exist in
    // the main document at all.
    await expect(page.locator('[data-testid="frame-button"]')).toHaveCount(0);

    const frame = page.frameLocator('#demo-frame');
    await frame.getByTestId('frame-name').fill('Kyoshi');
    await frame.getByTestId('frame-button').click();
    await expect(frame.getByTestId('frame-result')).toHaveText('Frame received: Kyoshi');
  });

  test('hover menu is absent until hovered', async ({ page }) => {
    await page.goto(APP + '?reset');
    await expect(page.getByTestId('hover-item-1')).toBeHidden();
    await page.getByTestId('hover-target').hover();
    await expect(page.getByTestId('hover-item-1')).toBeVisible();
  });

  test('sorting reorders rows, so position is not identity', async ({ page }) => {
    await page.goto(APP + '?reset');
    const first = () => page.locator('#sortable-body tr').first();

    const before = await first().getAttribute('data-instructor');
    await page.getByTestId('sort-price').click();
    const after = await first().getAttribute('data-instructor');
    expect(after, 'sorting should change which row is first').not.toBe(before);
  });

  test('the scrolling table total equals the sum of its rows', async ({ page }) => {
    await page.goto(APP + '?reset');
    const cells = await page.getByTestId('amount-cell').allTextContents();
    const sum = cells.reduce((a, c) => a + Number(c), 0);
    await expect(page.getByTestId('scroll-total')).toHaveText(String(sum));
    expect(cells.length, 'rows below the fold must still be counted').toBeGreaterThan(10);
  });

  test('pagination is required to reach a later record', async ({ page }) => {
    await page.goto(APP + '?reset');
    await expect(page.locator('[data-ticket="T-017"]')).toHaveCount(0);

    for (let i = 0; i < 5; i++) {
      if (await page.locator('[data-ticket="T-017"]').count()) break;
      await page.getByTestId('page-next').click();
    }
    await expect(page.locator('[data-ticket="T-017"]')).toHaveCount(1);
  });

  test('dynamic content is waited for, not slept through', async ({ page }) => {
    await page.goto(APP + '?reset');
    await expect(page.getByTestId('loaded-content')).toBeHidden();
    await page.getByTestId('load-btn').click();
    await expect(page.getByTestId('loaded-content')).toBeVisible();
    await expect(page.getByTestId('loading')).toBeHidden();
  });

  test('drag and drop moves the card', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('drag-item').dragTo(page.getByTestId('drop-target'));
    await expect(page.getByTestId('drag-output')).toHaveText('Dropped successfully');
    await expect(page.getByTestId('drop-target').getByTestId('drag-item')).toBeVisible();
  });

  test('shadow DOM control is reachable', async ({ page }) => {
    await page.goto(APP + '?reset');
    // Playwright pierces open shadow roots, so no special API is needed —
    // but the element is genuinely inside one.
    const inShadow = await page.getByTestId('shadow-host').evaluate((h) => !!h.shadowRoot);
    expect(inShadow, 'host should have a shadow root').toBe(true);

    await page.getByTestId('shadow-button').click();
    await expect(page.getByTestId('shadow-output')).toHaveText('Shadow button clicked');
  });

  test('the link-check exercise contains exactly one broken link', async ({ page, request }) => {
    await page.goto(APP + '?reset');
    const hrefs = await page.locator('#hover a[data-testid^="link-"]').evaluateAll(
      (els) => els.map((a) => a.href)
    );
    expect(hrefs.length).toBe(3);

    const statuses = [];
    for (const href of hrefs) statuses.push((await request.get(href)).status());
    expect(statuses.filter((s) => s >= 400).length, 'exactly one link should 404').toBe(1);
  });
});
