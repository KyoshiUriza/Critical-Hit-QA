const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PAGE = '/pages/code-review.html';

test.describe('Code Review Gauntlet', () => {
  test('every exercise is well-formed and has both defects and decoys', () => {
    // Data-level check: a decoy-free exercise makes "tick everything" a winning
    // strategy, which defeats the whole point of the feature.
    global.window = {};
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'js', 'data', 'code-review-exercises.js'), 'utf8'
    );
    // eslint-disable-next-line no-eval
    eval(src);
    const list = global.window.CODE_REVIEW_EXERCISES;

    expect(list.length).toBeGreaterThanOrEqual(6);
    const ids = new Set();
    for (const ex of list) {
      expect(ids.has(ex.id), `duplicate exercise id ${ex.id}`).toBe(false);
      ids.add(ex.id);
      expect(ex.code, `${ex.id} has no snippet`).toBeTruthy();
      expect(ex.fixed, `${ex.id} has no fixed version`).toBeTruthy();
      expect(ex.brief).toBeTruthy();

      const real = ex.issues.filter((i) => i.present);
      const decoys = ex.issues.filter((i) => !i.present);
      expect(real.length, `${ex.id} has no real defects`).toBeGreaterThanOrEqual(2);
      expect(decoys.length, `${ex.id} has no decoys — ticking everything would win`).toBeGreaterThanOrEqual(1);
      for (const i of ex.issues) {
        expect(i.label, `${ex.id}/${i.id} missing label`).toBeTruthy();
        expect(i.why, `${ex.id}/${i.id} missing explanation`).toBeTruthy();
      }
    }
    delete global.window;
  });

  test('renders the first exercise with a snippet and no leaked answers', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await expect(page.getByTestId('cr-code')).toContainText('waitForTimeout');
    await expect(page.getByTestId('cr-issues').locator('.cr-issue')).toHaveCount(6);
    // Explanations must stay hidden until graded, or the exercise is a giveaway.
    await expect(page.locator('.cr-why:not(.hidden)')).toHaveCount(0);
    await expect(page.getByTestId('cr-verdict')).toBeHidden();
    await expect(page.getByTestId('cr-fixed')).toBeHidden();
  });

  test('a perfect review is recognised as clean', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    // Tick exactly the real defects for the first exercise.
    const real = await page.evaluate(() =>
      window.CODE_REVIEW_EXERCISES[0].issues.filter((i) => i.present).map((i) => i.id)
    );
    for (const id of real) {
      await page.locator(`[data-issue-box="${id}"]`).check();
    }
    await page.getByTestId('cr-grade').click();

    const verdict = page.getByTestId('cr-verdict');
    await expect(verdict).toBeVisible();
    await expect(verdict).toContainText('Clean review');
    await expect(verdict).toContainText(`${real.length} of ${real.length} defects found`);
    await expect(page.getByTestId('cr-fixed')).toBeVisible();
  });

  test('ticking everything scores badly — decoys are penalised', async ({ page }) => {
    // The behaviour the feature exists to teach: over-flagging is a failure
    // mode, not a safe default.
    await page.goto(PAGE + '?reset');
    const boxes = page.locator('[data-issue-box]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();

    await page.getByTestId('cr-grade').click();
    const verdict = page.getByTestId('cr-verdict');
    await expect(verdict).toContainText('flagged');
    await expect(verdict).not.toContainText('Clean review');
    // The wrongly-flagged rows are called out individually.
    expect(await page.locator('.cr-false').count()).toBeGreaterThan(0);
  });

  test('missed defects are marked and explained', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await page.getByTestId('cr-grade').click(); // submit with nothing ticked

    expect(await page.locator('.cr-missed').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('cr-verdict')).toContainText('0 of');
    // Every explanation is now revealed, for right and wrong answers alike.
    await expect(page.locator('.cr-why:not(.hidden)').first()).toBeVisible();
  });

  test('grading records progress so the work counts', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await page.getByTestId('cr-grade').click();
    const runs = await page.evaluate(() => window.Progress.get().quiz.runs.length);
    expect(runs, 'a graded review should record a run').toBe(1);
  });

  test('navigation moves between exercises and resets state', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const first = await page.getByTestId('cr-code').textContent();
    await page.getByTestId('cr-next').click();
    const second = await page.getByTestId('cr-code').textContent();
    expect(second).not.toBe(first);
    // A fresh exercise must not carry the previous verdict.
    await expect(page.getByTestId('cr-verdict')).toBeHidden();
    await expect(page.locator('.cr-why:not(.hidden)')).toHaveCount(0);

    await page.getByTestId('cr-prev').click();
    expect(await page.getByTestId('cr-code').textContent()).toBe(first);
  });

  test('the snippet is rendered as text, never parsed as markup', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    // Snippets contain quotes, braces and angle brackets. If any of it were
    // interpolated into innerHTML it would render as elements.
    const inside = await page.getByTestId('cr-code').evaluate((el) => el.children.length);
    expect(inside, 'code block should contain text only').toBe(0);
  });

  test('a false positive lowers the recorded score', async ({ page }) => {
    // The page claims over-flagging costs you. The first version recorded
    // found/realTotal, so ticking everything banked full marks while the
    // verdict scolded the user — the prose and the number disagreed.
    await page.goto(PAGE + '?reset');
    const boxes = page.locator('[data-issue-box]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    await page.getByTestId('cr-grade').click();

    const run = await page.evaluate(() => window.Progress.get().quiz.runs[0]);
    expect(run.correct, 'all real defects were ticked').toBeGreaterThan(0);
    expect(run.total, 'decoys must inflate the denominator').toBeGreaterThan(run.correct);
  });

  test('the two failure states do not share a glyph', async ({ page }) => {
    // Colour alone separated "missed" from "wrongly flagged" (they measured
    // 1.01:1 apart), and both used the same mark.
    await page.goto(PAGE + '?reset');
    const decoy = await page.evaluate(() =>
      window.CODE_REVIEW_EXERCISES[0].issues.find((i) => !i.present).id
    );
    await page.locator(`[data-issue-box="${decoy}"]`).check();
    await page.getByTestId('cr-grade').click();

    await expect(page.locator(`[data-why="${decoy}"]`)).toContainText('⚠');
    await expect(page.locator('.cr-missed').first().locator('.cr-why')).toContainText('✗');
  });
});
