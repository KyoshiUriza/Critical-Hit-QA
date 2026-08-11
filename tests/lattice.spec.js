const { test, expect } = require('@playwright/test');

const PAGE = '/pages/tester-lattice.html';

test.describe('character sheet', () => {
  test('empty state renders every skill as Untrained with an honest zero', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    // 8 knowledge + 4 craft. .skill-row, not [data-testid^="skill-"] — that
    // prefix also matches the skill-tier span inside every row.
    await expect(page.locator(".skill-row")).toHaveCount(12);
    const tiers = await page.getByTestId('skill-tier').allTextContents();
    expect(tiers.every((t) => t === 'Untrained')).toBe(true);
    await expect(page.getByTestId('activity-log')).toContainText('Nothing yet');
  });

  test('skill tiers are computed from the actual quiz record', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await page.evaluate(() => {
      // 12 sql attempts at 75% -> Apprentice (>=10 attempts, >=60%).
      // 2 manual attempts -> Novice regardless of accuracy.
      window.__qa.seed({
        quiz: {
          runs: [{ category: 'sql', correct: 9, total: 12, elapsedMs: 1000, at: '2026-08-10' }],
          byCategory: {
            sql: { attempted: 12, correct: 9, runs: 1 },
            manual: { attempted: 2, correct: 0, runs: 1 }
          }
        }
      });
    });
    await page.goto(PAGE); // NOT reload() — that re-sends ?reset and wipes the seed

    await expect(page.getByTestId('skill-sql').getByTestId('skill-tier')).toHaveText('Apprentice');
    await expect(page.getByTestId('skill-sql')).toContainText('9/12 correct (75%)');
    await expect(page.getByTestId('skill-manual').getByTestId('skill-tier')).toHaveText('Novice');
    await expect(page.getByTestId('skill-automation').getByTestId('skill-tier')).toHaveText('Untrained');
  });

  test('accuracy alone cannot raise a tier — volume is required', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await page.evaluate(() => {
      // 3/3 = 100% accuracy, but only 3 attempts: must stay Novice.
      window.__qa.seed({
        quiz: { runs: [], byCategory: { api: { attempted: 3, correct: 3, runs: 1 } } }
      });
    });
    await page.goto(PAGE); // NOT reload() — that re-sends ?reset and wipes the seed
    await expect(page.getByTestId('skill-api').getByTestId('skill-tier')).toHaveText('Novice');
  });

  test('craft skills reflect drafts, defects and streak', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await page.evaluate(() => {
      window.Progress.saveArtifact({ type: 'test-case', title: 'TC', fields: {} });
      // Bounty finds and streak have no direct Progress API from this page,
      // so layer them onto the stored state.
      window.__qa.seed(Object.assign(window.Progress.get(), {
        bugBounty: { login: ['email-regex'] },
        streak: { lastDate: '2026-08-10', days: 3 }
      }));
    });
    await page.goto(PAGE); // NOT reload() — that re-sends ?reset and wipes the seed

    await expect(page.getByTestId('skill-test-design').getByTestId('skill-tier')).toHaveText('Novice');
    await expect(page.getByTestId('skill-consistency')).toContainText('3-day streak');
    // One low-severity find out of the whole catalog is >0%, so Novice.
    await expect(page.getByTestId('skill-defect-hunting').getByTestId('skill-tier')).not.toHaveText('Untrained');
  });

  test('the profile name renders as text, not markup', async ({ page }) => {
    await page.goto('/pages/account.html?reset');
    await page.getByTestId('new-profile-name').fill('<b>Sheet</b>&<i>');
    await page.getByTestId('create-profile').click();

    await page.goto(PAGE);
    const identity = page.getByTestId('sheet-identity');
    await expect(identity).toContainText('<b>Sheet</b>&<i>');
    expect(await identity.locator('b, i').count()).toBe(0);
  });

  test('recent activity interleaves quiz runs and drafts, newest first', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await page.evaluate(() => {
      window.Progress.recordQuizRun({ category: 'sql', correct: 4, total: 5, elapsedMs: 900 });
      window.Progress.saveArtifact({ type: 'bug-report', title: 'Cart total wrong', fields: {} });
    });
    await page.goto(PAGE); // NOT reload() — that re-sends ?reset and wipes the seed

    const log = page.getByTestId('activity-log');
    await expect(log).toContainText('Quiz — sql: 4/5');
    await expect(log).toContainText('Bug report — Cart total wrong');
  });

  test('milestone descriptions explain the skill, not the novel', async ({ page }) => {
    // The rework's core promise: no achievement text should require having
    // read the book. These names were the offenders — characters and factions
    // with no meaning to a site visitor.
    await page.goto(PAGE + '?reset');
    const text = await page.locator('#achievements-list').textContent();
    for (const loreOnly of ['Remii', 'Kestrel', 'D.A.C.', 'aetheric', 'Aetheric']) {
      expect(text, `book-plot reference "${loreOnly}" survived the rework`).not.toContain(loreOnly);
    }
    // And every locked milestone must say how to earn it.
    const hints = await page.locator('.rpg-hint').allTextContents();
    expect(hints.length).toBeGreaterThanOrEqual(10);
    for (const h of hints) {
      expect(h === 'Unlocked.' || h.startsWith('To unlock:')).toBe(true);
    }
  });

  test('the rank ladder highlights the current rank', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    await expect(page.locator('.rank-current')).toHaveCount(1);
    await expect(page.locator('.rank-current')).toContainText('Unbound');
  });

  test('skill bars expose meter semantics to assistive tech', async ({ page }) => {
    await page.goto(PAGE + '?reset');
    const meters = page.locator('[role="meter"]');
    await expect(meters).toHaveCount(12);
    const first = meters.first();
    await expect(first).toHaveAttribute('aria-valuemin', '0');
    await expect(first).toHaveAttribute('aria-valuemax', '5');
    await expect(first).toHaveAttribute('aria-valuetext', /Untrained|Novice|Apprentice|Practitioner|Adept|Expert/);
  });
});
