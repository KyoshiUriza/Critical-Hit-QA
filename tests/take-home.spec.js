const { test, expect } = require('@playwright/test');

const PAGE = '/pages/take-home.html';

async function startBrief(page, id) {
  await page.goto(PAGE + '?reset');
  await page.locator(`[data-start="${id}"]`).click();
  await expect(page.getByTestId('assign-title')).toBeVisible();
}

async function fillSubmission(page, over) {
  const v = Object.assign({
    title: 'Tax is charged on the pre-discount subtotal, overcharging every order with a coupon',
    severity: 'S2',
    steps: '1. Add Widget ($10.00) to the cart\n2. Apply coupon SAVE10\n3. Read the Tax line and compare against 8% of the discounted subtotal',
    expected: 'Tax of $0.72 — 8% of the discounted $9.00',
    actual: 'Tax of $0.80 — 8% of the pre-discount $10.00',
    notes: 'Do not ship Thursday. Two defects affect the amount charged to the customer.',
  }, over || {});

  await page.getByTestId('th-title').fill(v.title);
  await page.getByTestId('th-severity').selectOption(v.severity);
  await page.getByTestId('th-steps').fill(v.steps);
  await page.getByTestId('th-expected').fill(v.expected);
  await page.getByTestId('th-actual').fill(v.actual);
  await page.getByTestId('th-notes').fill(v.notes);
}

test.describe('Take-Home Simulator', () => {
  test('a brief carries context, a narrowed scope, and a deliverable', async ({ page }) => {
    // Half of what a take-home grades is whether you stayed in scope, so the
    // brief has to state one.
    await startBrief(page, 'checkout');
    await expect(page.getByTestId('assign-context')).not.toBeEmpty();
    await expect(page.getByTestId('assign-scope').locator('li')).not.toHaveCount(0);
    await expect(page.getByTestId('assign-deliverable')).not.toBeEmpty();
    await expect(page.getByTestId('open-app')).toHaveAttribute('href', /cart-broken/);
  });

  test('the clock runs and survives navigating away to the app', async ({ page }) => {
    await startBrief(page, 'checkout');
    await expect(page.getByTestId('clock')).toHaveText(/0m \d\ds/);

    // Go to the app and back — a real run does this immediately.
    await page.goto('/practice-apps/cart-broken.html');
    await page.goto(PAGE);
    await expect(page.getByTestId('assign-title')).toBeVisible();
    await expect(page.getByTestId('clock')).toBeVisible();
  });

  test('an incomplete submission is refused with a reason', async ({ page }) => {
    await startBrief(page, 'checkout');
    await page.getByTestId('th-title').fill('Something is wrong');
    await page.getByTestId('submit-assignment').click();
    await expect(page.getByTestId('submit-error')).toContainText('title and steps');
    await expect(page.getByTestId('result')).toBeHidden();
  });

  test('a strong submission passes the rubric and reveals the build', async ({ page }) => {
    await startBrief(page, 'checkout');

    // Actually trigger the high-severity defects, the way a real run would.
    await page.goto('/practice-apps/cart-broken.html');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();

    await page.goto(PAGE);
    await fillSubmission(page);
    await page.getByTestId('submit-assignment').click();

    const result = page.getByTestId('result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('Submitted');
    // Found a high-severity defect, and severity is defensible.
    await expect(page.getByTestId('rubric-found-critical')).toHaveClass(/rubric-pass/);
    await expect(page.getByTestId('rubric-severity-sane')).toHaveClass(/rubric-pass/);
    await expect(page.getByTestId('rubric-repro-steps')).toHaveClass(/rubric-pass/);
    // And the reveal lists every seeded defect, marked found or not.
    await expect(result).toContainText('What was in the build');
  });

  test('reporting a money defect as Low is called out', async ({ page }) => {
    // Severity calibration is what a reviewer notices first, so the grader
    // has to actually check it rather than accept any value.
    await startBrief(page, 'checkout');
    await page.goto('/practice-apps/cart-broken.html');
    await page.getByTestId('add-widget').click();
    await page.getByTestId('coupon-input').fill('SAVE10');
    await page.getByTestId('apply-coupon').click();

    await page.goto(PAGE);
    await fillSubmission(page, { severity: 'S4' });
    await page.getByTestId('submit-assignment').click();

    await expect(page.getByTestId('rubric-severity-sane')).toHaveClass(/rubric-miss/);
  });

  test('finding nothing fails the coverage check honestly', async ({ page }) => {
    await startBrief(page, 'checkout');
    await fillSubmission(page);
    await page.getByTestId('submit-assignment').click();
    // Nothing was triggered in the app, so no high-severity defect was reached.
    await expect(page.getByTestId('rubric-found-critical')).toHaveClass(/rubric-miss/);
  });

  test('a submission lands in the portfolio and exports', async ({ page }) => {
    await startBrief(page, 'login-audit');
    await fillSubmission(page, { title: 'Password persisted in localStorage in clear text' });
    await page.getByTestId('submit-assignment').click();
    await expect(page.getByTestId('result')).toBeVisible();

    await page.goto('/pages/portfolio.html');
    await expect(page.getByTestId('artifact-take-home')).toHaveCount(1);

    await page.getByTestId('export-markdown').click();
    const md = await page.getByTestId('export-out').textContent();
    expect(md).toContain('# Take-home assignments');
    expect(md).toContain('Password persisted');
    expect(md, 'the time taken is part of the record').toMatch(/Time taken:.*minutes/);
  });

  test('every brief points at an app that exists and has seeded defects', async ({ page }) => {
    // A brief aimed at a missing app, or one with no catalog, would be an
    // assignment nobody can pass.
    await page.goto(PAGE + '?reset');
    const problems = await page.evaluate(() => {
      const out = [];
      window.TAKEHOME_BRIEFS.forEach((b) => {
        const cat = window.APP_DEFECTS[b.app];
        if (!cat) { out.push(b.id + ': no defect catalog for ' + b.app); return; }
        if (!b.scope || !b.scope.length) out.push(b.id + ': no scope');
        if (!b.rubric || b.rubric.length < 3) out.push(b.id + ': rubric too thin');
        (b.expectHigh || []).forEach((id) => {
          if (!cat.defects.some((d) => d.id === id)) out.push(b.id + ': expectHigh names unknown defect ' + id);
        });
      });
      return out;
    });
    expect(problems).toEqual([]);
  });
});

test.describe('Interview rehearsal mode', () => {
  const IQ = '/pages/interview-questions.html';

  test('is off by default — the answer is visible as before', async ({ page }) => {
    await page.goto(IQ + '?reset');
    await expect(page.locator('.rehearse')).toHaveCount(0);
    await expect(page.locator('.answer').first()).not.toHaveClass(/hidden/);
  });

  test('hides the answer behind your own attempt', async ({ page }) => {
    await page.goto(IQ + '?reset');
    await page.getByTestId('rehearse-toggle').check();

    // The block lives inside the collapsed <details>, so open the question
    // first — that is the real interaction, not a workaround.
    await page.locator('.q-item').first().locator('summary').click();
    await expect(page.locator('.rehearse').first()).toBeVisible();
    await expect(page.locator('.answer').first()).toHaveClass(/hidden/);
  });

  test('revealing locks what you wrote and offers a self-check', async ({ page }) => {
    // Editing after reading turns a rehearsal into a transcription — the same
    // reason the Code Review Gauntlet locks its notes at grading.
    await page.goto(IQ + '?reset');
    await page.getByTestId('rehearse-toggle').check();

    const first = page.locator('.q-item').first();
    await first.locator('summary').click();
    await first.locator('[data-rehearse-input]').fill('QA is process, QC is product, testing is the activity.');
    await first.locator('[data-reveal]').click();

    await expect(first.locator('.answer')).not.toHaveClass(/hidden/);
    await expect(first.locator('[data-rehearse-input]')).toBeDisabled();
    await expect(first.getByTestId('rehearse-check')).toBeVisible();
    await expect(first.getByTestId('rehearse-check').locator('input[type="checkbox"]')).toHaveCount(4);
  });

  test('the preference survives a reload', async ({ page }) => {
    await page.goto(IQ + '?reset');
    await page.getByTestId('rehearse-toggle').check();
    await page.goto(IQ);
    await expect(page.getByTestId('rehearse-toggle')).toBeChecked();
    await page.locator('.q-item').first().locator('summary').click();
    await expect(page.locator('.rehearse').first()).toBeVisible();
  });
});
