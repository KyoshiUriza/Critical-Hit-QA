// The Bug Bounty score must never exceed the number of defects that exist.
//
// A real user reported "9 of 8 bugs found" on the Login app. They had found
// pw-length back when it was seeded, and it was later removed because a
// minimum-length rule is not a defect on a sign-in form. Their stored finds
// still claimed it.
//
// progress-schema.js had validated ids against the catalog since it was
// written — but only on the import path. Nothing checked them on ordinary
// load, which is how every real user reached that state. The fix is at the
// storage layer, so the invariant holds for every consumer rather than each
// screen clamping its own number.
const { test, expect } = require('@playwright/test');

const BOUNTY = '/pages/bug-bounty.html';

// Write a finds list straight into storage, the way a returning user's
// browser would already have it.
async function seedFinds(page, appKey, ids) {
  await page.evaluate(([k, v]) => {
    const key = window.Profiles ? window.Profiles.storageKey() : 'qaprep_progress_v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.bugBounty = data.bugBounty || {};
    data.bugBounty[k] = v;
    localStorage.setItem(key, JSON.stringify(data));
  }, [appKey, ids]);
}

test.describe('bug bounty cannot exceed the catalog', () => {
  test('a find for a defect that no longer exists is dropped on load', async ({ page }) => {
    await page.goto(BOUNTY + '?reset');
    const real = await page.evaluate(() =>
      window.APP_DEFECTS.login.defects.map((d) => d.id));

    // Exactly the reported state: every current defect, plus the retired one.
    await seedFinds(page, 'login', real.concat(['pw-length']));
    // Not reload(): it keeps ?reset, which clears the seed we just wrote.
    await page.goto(BOUNTY);

    const kept = await page.evaluate(() => window.Progress.getBugBountyFinds('login'));
    expect(kept).not.toContain('pw-length');
    expect(kept.length).toBe(real.length);
  });

  test('the retired find is erased from storage, not just hidden', async ({ page }) => {
    await page.goto(BOUNTY + '?reset');
    await seedFinds(page, 'login', ['email-case', 'pw-length']);
    await page.goto(BOUNTY);
    await page.evaluate(() => window.Progress.get());

    const raw = await page.evaluate(() => {
      const key = window.Profiles ? window.Profiles.storageKey() : 'qaprep_progress_v1';
      return JSON.parse(localStorage.getItem(key) || '{}').bugBounty.login;
    });
    expect(raw, 'filtered on read but left rotting in storage').toEqual(['email-case']);
  });

  test('the page never renders a score above the total, for any app', async ({ page }) => {
    await page.goto(BOUNTY + '?reset');
    const apps = await page.evaluate(() =>
      Object.entries(window.APP_DEFECTS).map(([k, a]) => [k, a.defects.length]));

    // Adversarial: claim every real id plus several that never existed.
    for (const [key] of apps) {
      const ids = await page.evaluate((k) =>
        window.APP_DEFECTS[k].defects.map((d) => d.id), key);
      await seedFinds(page, key, ids.concat(['ghost-1', 'ghost-2', 'pw-length']));
    }
    await page.goto(BOUNTY);

    const text = await page.locator('#main').textContent();
    const scores = [...text.matchAll(/(\d+)\s*\/\s*(\d+)\s*found/g)];

    // Without this the test passes when the page renders no scores at all,
    // which is exactly the shape of guard this repo has already shipped once
    // and had to fix.
    expect(scores.length, 'no "N/M found" scores on the page to check')
      .toBe(apps.length);

    const bad = scores.filter((m) => Number(m[1]) > Number(m[2])).map((m) => m[0]);
    expect(bad, 'a score higher than the maximum possible score').toEqual([]);

    // Every app should read as fully found, since we claimed every real id.
    const short = scores.filter((m) => m[1] !== m[2]).map((m) => m[0]);
    expect(short, 'real ids were dropped along with the ghosts').toEqual([]);
  });

  test('writing an unknown id does not store it', async ({ page }) => {
    await page.goto(BOUNTY + '?reset');
    await page.evaluate(() =>
      window.Progress.setBugBountyFinds('login', ['email-case', 'not-a-real-defect']));
    const kept = await page.evaluate(() => window.Progress.getBugBountyFinds('login'));
    expect(kept).toEqual(['email-case']);
  });

  test('reconciliation is skipped when the catalog is not loaded', async ({ page }) => {
    // Several practice apps load progress.js without defects.js. Treating a
    // missing catalog as "nothing is valid" would delete every find the user
    // has, which is a far worse bug than the one being fixed.
    await page.goto('/practice-apps/locator-lab.html?reset');
    const hasCatalog = await page.evaluate(() => !!window.APP_DEFECTS);

    await page.evaluate(() => {
      const key = window.Profiles ? window.Profiles.storageKey() : 'qaprep_progress_v1';
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      data.bugBounty = { login: ['email-case', 'email-regex'] };
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.goto('/practice-apps/locator-lab.html');

    const kept = await page.evaluate(() => window.Progress.getBugBountyFinds('login'));
    if (hasCatalog) {
      expect(kept).toEqual(['email-case', 'email-regex']);
    } else {
      expect(kept, 'finds were wiped because the catalog was absent').toHaveLength(2);
    }
  });

  test('unknown app keys are left alone rather than dropped', async ({ page }) => {
    // An app removed from the catalog mid-refactor should not cost the user
    // their recorded work.
    await page.goto(BOUNTY + '?reset');
    await page.evaluate(() => {
      const key = window.Profiles ? window.Profiles.storageKey() : 'qaprep_progress_v1';
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      data.bugBounty = data.bugBounty || {};
      data.bugBounty['some-future-app'] = ['a', 'b'];
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.goto(BOUNTY);
    const kept = await page.evaluate(() => window.Progress.getBugBountyFinds('some-future-app'));
    expect(kept).toEqual(['a', 'b']);
  });
});
