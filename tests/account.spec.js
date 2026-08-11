const { test, expect } = require('@playwright/test');

const ACCOUNT = '/pages/account.html';

async function seedProgress(page) {
  // Record a run through the real API rather than writing storage directly, so
  // the test exercises the same path the app does.
  await page.evaluate(() => {
    window.Progress.recordQuizRun({ category: 'sql', correct: 4, total: 5, elapsedMs: 1000 });
    window.Progress.saveArtifact({
      type: 'bug-report',
      title: 'Cart total ignores quantity',
      fields: { summary: 'Totals are wrong', steps: '1. add two items' }
    });
  });
}

test.describe('profiles', () => {
  test('there is a default profile and it is active', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    const rows = page.getByTestId('profile-row');
    await expect(rows).toHaveCount(1);
    await expect(page.getByTestId('active-badge')).toBeVisible();
  });

  test('creating a profile makes it active and isolates its progress', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    await seedProgress(page);

    await page.getByTestId('new-profile-name').fill('Second');
    await page.getByTestId('create-profile').click();

    await expect(page.getByTestId('profile-row')).toHaveCount(2);

    // The new profile starts empty — the point of the feature.
    const runs = await page.evaluate(() => window.Progress.get().quiz.runs.length);
    expect(runs, 'a new profile should not inherit the previous one').toBe(0);

    // Switching back restores the original data rather than losing it.
    await page.getByTestId('profile-row').first().getByTestId('switch-profile').click();
    const restored = await page.evaluate(() => window.Progress.get().quiz.runs.length);
    expect(restored).toBe(1);
  });

  test('duplicate and empty names are rejected with a message', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    await page.getByTestId('create-profile').click();
    await expect(page.getByTestId('create-error')).toBeVisible();

    await page.getByTestId('new-profile-name').fill('Tester'); // same as the default
    await page.getByTestId('create-profile').click();
    await expect(page.getByTestId('create-error')).toContainText('already have a profile');
    await expect(page.getByTestId('profile-row')).toHaveCount(1);
  });

  test('a profile name is rendered as text, not markup', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    // Kept under the 24-character name cap so the assertion tests escaping
    // rather than truncation — the first version of this used a longer payload
    // and passed for the wrong reason.
    const payload = '<img src=x onerror=1>';
    expect(payload.length).toBeLessThanOrEqual(24);

    await page.getByTestId('new-profile-name').fill(payload);
    await page.getByTestId('create-profile').click();

    await expect(page.getByTestId('profile-list')).toContainText(payload);
    expect(await page.locator('#profile-list img').count()).toBe(0);
  });
});

test('progress recorded on OTHER pages lands in the active profile', async ({ page }) => {
  // The bug this guards: profiles.js was only loaded on three pages, and
  // progress.js silently falls back to the default storage key when it is
  // absent. So with a second profile active, taking a quiz on the quiz page
  // recorded into the default profile — data quietly crossing accounts.
  await page.goto(ACCOUNT + '?reset');
  await page.getByTestId('new-profile-name').fill('Second');
  await page.getByTestId('create-profile').click();

  // Record progress from a page that is NOT the account page.
  await page.goto('/pages/practice-tests.html');
  await page.evaluate(() => {
    window.Progress.recordQuizRun({ category: 'sql', correct: 3, total: 5, elapsedMs: 500 });
  });

  const keys = await page.evaluate(() => {
    const reg = JSON.parse(localStorage.getItem('qaprep_profiles_v1'));
    const activeId = reg.activeId;
    const activeData = JSON.parse(localStorage.getItem('qaprep_progress_v1:' + activeId) || '{}');
    const defaultData = JSON.parse(localStorage.getItem('qaprep_progress_v1') || '{}');
    return {
      activeRuns: (activeData.quiz && activeData.quiz.runs || []).length,
      defaultRuns: (defaultData.quiz && defaultData.quiz.runs || []).length,
    };
  });
  expect(keys.activeRuns, 'run should land in the active profile').toBe(1);
  expect(keys.defaultRuns, 'run must not leak into the default profile').toBe(0);
});

test.describe('sync codes', () => {
  test('a code round-trips progress into a fresh profile', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    await seedProgress(page);

    await page.getByTestId('export-code').click();
    const code = await page.getByTestId('export-out').inputValue();
    expect(code).toMatch(/^CHQ1\.[A-Za-z0-9_-]+\.[a-z0-9]+$/);

    // Move to a different profile, which starts empty.
    await page.getByTestId('new-profile-name').fill('Laptop');
    await page.getByTestId('create-profile').click();
    expect(await page.evaluate(() => window.Progress.get().quiz.runs.length)).toBe(0);

    await page.getByTestId('import-in').fill(code);
    await page.getByTestId('preview-code').click();

    // Nothing is written until it is confirmed.
    await expect(page.getByTestId('confirm-summary')).toContainText('1 quiz run');
    expect(await page.evaluate(() => window.Progress.get().quiz.runs.length)).toBe(0);

    await page.getByTestId('apply-code').click();
    await expect(page.getByTestId('import-ok')).toBeVisible();

    const after = await page.evaluate(() => window.Progress.get());
    expect(after.quiz.runs.length).toBe(1);
    expect(after.artifacts.length).toBe(1);
    expect(after.artifacts[0].title).toBe('Cart total ignores quantity');
    expect(after.artifacts[0].fields.summary).toBe('Totals are wrong');
  });

  test('canceling leaves existing progress untouched', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    await seedProgress(page);
    await page.getByTestId('export-code').click();
    const code = await page.getByTestId('export-out').inputValue();

    await page.evaluate(() => window.Progress.reset());
    await page.evaluate(() => {
      window.Progress.recordQuizRun({ category: 'api', correct: 1, total: 2, elapsedMs: 10 });
    });

    await page.getByTestId('import-in').fill(code);
    await page.getByTestId('preview-code').click();
    await page.getByTestId('cancel-code').click();

    const after = await page.evaluate(() => window.Progress.get());
    expect(after.quiz.runs[0].category, 'cancel must not overwrite').toBe('api');
  });

  test('a truncated code is rejected before anything is written', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    await seedProgress(page);
    await page.getByTestId('export-code').click();
    const code = await page.getByTestId('export-out').inputValue();

    await page.getByTestId('import-in').fill(code.slice(0, code.length - 12));
    await page.getByTestId('preview-code').click();

    await expect(page.getByTestId('import-error')).toBeVisible();
    await expect(page.getByTestId('confirm-box')).toBeHidden();
    expect(await page.evaluate(() => window.Progress.get().quiz.runs.length)).toBe(1);
  });

  test('junk input produces a message, not an exception', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');
    for (const junk of ['', 'hello', 'CHQ1.notbase64.zz', 'CHQ9.aaa.bbb', '....']) {
      await page.getByTestId('import-in').fill(junk);
      await page.getByTestId('preview-code').click();
      await expect(page.getByTestId('import-error')).toBeVisible();
      await expect(page.getByTestId('confirm-box')).toBeHidden();
    }
  });

  test('a hostile code cannot smuggle unknown fields or fake defect finds', async ({ page }) => {
    await page.goto(ACCOUNT + '?reset');

    // Built by hand the way an attacker would, then run through the real
    // decoder. Claimed finds are checked against the defect catalog, so a
    // fabricated id cannot inflate the dashboard.
    const hostile = await page.evaluate(() => {
      const payload = {
        v: 1,
        name: 'Attacker',
        savedAt: '2026-01-01',
        data: {
          quiz: { runs: [], byCategory: { notacategory: { attempted: 999, correct: 999, runs: 9 } } },
          // 'login' is a real key in the defect catalog with a fabricated
          // defect id; 'no-such-app' is not a real key at all. Both routes in.
          bugBounty: { login: ['NOT-A-REAL-DEFECT'], 'no-such-app': ['x'] },
          studyPlan: { 'evil-plan': { 0: true } },
          artifacts: [{ type: 'not-a-type', title: 'x', fields: {} }],
          bugReports: 99999,
          evilExtraField: 'should not survive',
          __proto__: { polluted: true }
        }
      };
      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      let h = 5381;
      for (let i = 0; i < b64.length; i++) h = ((h << 5) + h + b64.charCodeAt(i)) >>> 0;
      return 'CHQ1.' + b64 + '.' + h.toString(36);
    });

    await page.getByTestId('import-in').fill(hostile);
    await page.getByTestId('preview-code').click();
    await expect(page.getByTestId('confirm-box')).toBeVisible();
    await page.getByTestId('apply-code').click();

    const after = await page.evaluate(() => window.Progress.get());
    expect(Object.keys(after.quiz.byCategory), 'unknown category kept').toEqual([]);
    expect(after.bugBounty['no-such-app'], 'unknown app kept').toBeUndefined();
    expect(after.bugBounty.login, 'fabricated defect id kept').toEqual([]);
    expect(after.studyPlan['evil-plan'], 'unknown study plan kept').toBeUndefined();
    expect(after.artifacts, 'artifact with unknown type kept').toEqual([]);
    expect(after.evilExtraField, 'unknown field survived the whitelist').toBeUndefined();
    expect(await page.evaluate(() => ({}).polluted), 'prototype was polluted').toBeUndefined();
  });
});
