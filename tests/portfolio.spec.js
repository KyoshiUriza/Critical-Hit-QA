// Theme 1 — the portfolio promise the home page makes.
//
// Before this, "Save to progress" only incremented a counter: the dashboard
// said "3 bug reports" and could not show you one, and a refresh lost the
// authoring. These tests exist so that cannot regress silently.
const { test, expect } = require('@playwright/test');

test.describe('artifact persistence', () => {
  test('a draft survives a refresh without being saved manually', async ({ page }) => {
    await page.goto('/pages/bug-report-builder.html?reset');

    await page.locator('#br-id').fill('BUG-101');
    await page.locator('#br-title').fill('Login accepts an empty password');
    await page.locator('#br-actual').fill('Session is established with no password check.');
    // Autosave is debounced; wait past it rather than clicking Save.
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await expect(page.getByTestId('artifact-bug-report')).toHaveCount(1);
    await expect(page.getByTestId('artifact-bug-report')).toContainText('BUG-101');
  });

  test('reopening a draft restores every field including steps', async ({ page }) => {
    await page.goto('/pages/bug-report-builder.html?reset');
    await page.locator('#br-title').fill('Cart tax uses the wrong basis');
    await page.locator('#br-expected').fill('Tax applies to the discounted subtotal.');
    await page.locator('.step-action').first().fill('Add two widgets and one gadget.');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await page.getByTestId('artifact-bug-report').first().locator('a', { hasText: 'Open' }).click();

    await expect(page.locator('#br-title')).toHaveValue('Cart tax uses the wrong basis');
    await expect(page.locator('#br-expected')).toHaveValue('Tax applies to the discounted subtotal.');
    await expect(page.locator('.step-action').first()).toHaveValue('Add two widgets and one gadget.');
  });

  test('editing a reopened draft updates it rather than creating a duplicate', async ({ page }) => {
    await page.goto('/pages/test-case-builder.html?reset');
    await page.locator('#tc-title').fill('Valid credentials sign in');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await expect(page.getByTestId('artifact-test-case')).toHaveCount(1);
    await page.getByTestId('artifact-test-case').first().locator('a', { hasText: 'Open' }).click();

    await page.locator('#tc-title').fill('Valid credentials sign in successfully');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await expect(page.getByTestId('artifact-test-case')).toHaveCount(1);
    await expect(page.getByTestId('artifact-test-case')).toContainText('successfully');
  });

  test('New draft keeps the previous one and starts empty', async ({ page }) => {
    await page.goto('/pages/bug-report-builder.html?reset');
    await page.locator('#br-title').fill('First report');
    await page.waitForTimeout(1200);

    await page.getByTestId('new-draft').click();
    await expect(page.locator('#br-title')).toHaveValue('');

    await page.locator('#br-title').fill('Second report');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await expect(page.getByTestId('artifact-bug-report')).toHaveCount(2);
  });

  test('deleting an artifact removes it', async ({ page }) => {
    await page.goto('/pages/bug-report-builder.html?reset');
    await page.locator('#br-title').fill('Disposable');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    page.on('dialog', (d) => d.accept());
    await page.getByTestId('delete-artifact').first().click();

    await expect(page.getByTestId('portfolio-empty')).toBeVisible();
  });
});

test.describe('the hunt -> report loop', () => {
  test('a Bug Bounty find prefills the report builder', async ({ page }) => {
    await page.goto('/pages/bug-bounty.html?reset');
    // Tick the first defect so its write-up link appears.
    await page.locator('input[type="checkbox"][data-defect]').first().check();

    const writeUp = page.getByTestId('write-up').first();
    await expect(writeUp).toBeVisible();
    await writeUp.click();

    await expect(page).toHaveURL(/bug-report-builder\.html\?app=.+&defect=.+/);
    // Title, environment and a first step should all arrive filled.
    await expect(page.locator('#br-title')).not.toHaveValue('');
    await expect(page.locator('#br-env')).toContainText('', { timeout: 2000 });
    await expect(page.locator('#br-env')).not.toHaveValue('');
    await expect(page.locator('.step-action').first()).not.toHaveValue('');
  });
});

test.describe('portfolio export', () => {
  test('exports both artifact types as one Markdown document', async ({ page }) => {
    await page.goto('/pages/bug-report-builder.html?reset');
    await page.locator('#br-id').fill('BUG-1');
    await page.locator('#br-title').fill('Empty password accepted');
    await page.locator('#br-actual').fill('Welcome message shown.');
    await page.waitForTimeout(1200);

    await page.goto('/pages/test-case-builder.html');
    await page.locator('#tc-id').fill('TC-1');
    await page.locator('#tc-title').fill('Valid login');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await page.getByTestId('export-markdown').click();

    const out = page.getByTestId('export-out');
    await expect(out).toContainText('# QA Portfolio');
    await expect(out).toContainText('BUG-1 — Empty password accepted');
    await expect(out).toContainText('TC-1 — Valid login');
    await expect(out).toContainText('# Bug reports');
    await expect(out).toContainText('# Test cases');
  });

  test('the export carries no in-universe vocabulary (ADR 0001)', async ({ page }) => {
    // The lore belongs to the study experience. This document goes to employers.
    await page.goto('/pages/bug-report-builder.html?reset');
    await page.locator('#br-title').fill('A defect');
    await page.waitForTimeout(1200);

    await page.goto('/pages/portfolio.html');
    await page.getByTestId('export-markdown').click();
    const text = await page.getByTestId('export-out').textContent();

    for (const word of ['Star-Dust', 'Catalyst', 'Signature Ability', 'Lattice']) {
      expect(text, `export leaked in-universe term "${word}"`).not.toContain(word);
    }
  });

  test('shows an empty state before anything is drafted', async ({ page }) => {
    await page.goto('/pages/portfolio.html?reset');
    await expect(page.getByTestId('portfolio-empty')).toBeVisible();
    await expect(page.locator('#portfolio-body')).toBeHidden();
  });
});
