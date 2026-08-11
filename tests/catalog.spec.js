const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Files in practice-apps/ that are not standalone apps and so are not listed.
// frame-content.html exists to be loaded INSIDE the Component Gauntlet's
// iframe; linking it as an app would be misleading.
const NOT_APPS = new Set(['frame-content.html']);

function appFiles() {
  return fs.readdirSync(path.join(ROOT, 'practice-apps'))
    .filter((f) => f.endsWith('.html') && !NOT_APPS.has(f))
    .sort();
}

test.describe('practice app catalog', () => {
  test('every practice app is reachable from the Practice Apps page', async () => {
    // This exists because a new app shipped unlisted: the file was on disk,
    // the tests all passed, and there was no route to it from the site. An
    // app nobody can find is an app that does not exist.
    const listing = fs.readFileSync(path.join(ROOT, 'pages', 'practice-apps.html'), 'utf8');
    const orphans = appFiles().filter((f) => !listing.includes(`practice-apps/${f}`));
    expect(orphans, 'apps on disk but not linked from the listing page').toEqual([]);
  });

  test('the listing does not advertise apps that do not exist', async () => {
    const listing = fs.readFileSync(path.join(ROOT, 'pages', 'practice-apps.html'), 'utf8');
    const linked = [...listing.matchAll(/practice-apps\/([A-Za-z0-9-]+\.html)/g)].map((m) => m[1]);
    const missing = [...new Set(linked)].filter(
      (f) => !fs.existsSync(path.join(ROOT, 'practice-apps', f))
    );
    expect(missing, 'links to practice apps that are not on disk').toEqual([]);
  });

  test('the app count the home page claims matches reality', async ({ page }) => {
    // The claim drifted once already — the site said 14 apps while shipping
    // 16. On a site whose whole premise is that claims should be checkable,
    // its own headline numbers have to be checkable too.
    //
    // "Buggy" is derived from the DEFECT CATALOG, not the filename. The
    // a11y challenge has 13 seeded defects and is not called -broken, so the
    // filename heuristic counted it as clean and the guard passed on a wrong
    // number. What makes an app buggy is having seeded defects.
    await page.goto('/pages/bug-bounty.html?reset');
    const actual = appFiles().length;
    const buggyFiles = await page.evaluate(() =>
      Object.values(window.APP_DEFECTS).map((a) => a.url.split('/').pop()));
    const buggy = appFiles().filter((f) => buggyFiles.includes(f)).length;
    const clean = actual - buggy;

    await page.goto('/index.html');
    const home = await page.locator('main').textContent();

    expect(home, `home page should claim ${actual} apps`).toContain(`${actual} working apps`);
    expect(home, `home page should claim ${clean} clean`).toContain(`${clean} clean`);
    expect(home, `home page should claim ${buggy} buggy`).toContain(`${buggy} with seeded defects`);

    const stat = await page.getByTestId('stat-apps').textContent();
    expect(Number(stat), 'the stats strip should agree with the hero copy').toBe(actual);
  });

  test('every buggy app has a defect catalog entry', async ({ page }) => {
    // A -broken app with no seeded defects recorded would score as 0% forever
    // in Bug Bounty and silently teach nothing.
    await page.goto('/pages/bug-bounty.html?reset');
    const keys = await page.evaluate(() => Object.keys(window.APP_DEFECTS));
    // Every -broken build must have a catalog. (The reverse — a catalog
    // for an app not named -broken — is legitimate: see the a11y challenge.)
    const buggy = appFiles().filter((f) => f.endsWith('-broken.html'))
      .map((f) => f.replace('-broken.html', ''));
    for (const app of buggy) {
      expect(keys, `${app} has a buggy build but no defect catalog`).toContain(app);
    }
  });

  test('the seeded-defect count claimed in the docs matches the catalog', async ({ page }) => {
    // Same guard as the app count, for the same reason: removing "password
    // minimum length not enforced" from the login catalog left README and
    // the Buy Me a Coffee copy claiming 31 when there were 30.
    await page.goto('/pages/bug-bounty.html?reset');
    const total = await page.evaluate(() =>
      Object.values(window.APP_DEFECTS).reduce((n, a) => n + a.defects.length, 0)
    );

    for (const file of ['README.md', 'docs/buy-me-a-coffee-blurb.md']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      // Two shapes, because README had said "seeded defects (43 total)" —
      // the number AFTER the word, which the original pattern never saw. It
      // sat wrong for three commits while this guard reported green.
      const claims = [
        ...[...text.matchAll(/(\d+)\s+(?:real\s+|seeded\s+|total\s+)?defects?/gi)].map((m) => Number(m[1])),
        ...[...text.matchAll(/defects?\s*\((\d+)\s+total\)/gi)].map((m) => Number(m[1])),
      ].filter((n) => n > 5);   // ignore per-app figures and prose numbers
      for (const claim of claims) {
        expect(claim, `${file} claims ${claim} defects, catalog has ${total}`).toBe(total);
      }
    }
  });

  test('every seeded defect has a hint that says how to reproduce it', async ({ page }) => {
    // A defect nobody can find is not an exercise. The one that prompted this
    // was reachable only through DevTools and said so nowhere.
    await page.goto('/pages/bug-bounty.html?reset');
    const thin = await page.evaluate(() => {
      const out = [];
      Object.entries(window.APP_DEFECTS).forEach(([app, a]) => {
        a.defects.forEach((d) => {
          if (!d.hint || d.hint.trim().length < 20) out.push(app + '/' + d.id);
        });
      });
      return out;
    });
    expect(thin, 'defects whose hint is too thin to act on').toEqual([]);
  });

  test('the clean login does not enforce password composition at sign-in', async ({ page }) => {
    // The reference build was modeling the wrong pattern: length and
    // composition are registration-time rules. Enforcing them at sign-in adds
    // no security, leaks the policy, and locks out older accounts.
    await page.goto('/practice-apps/login.html?reset');
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('x');
    await page.getByTestId('login-submit').click();

    const err = (await page.getByTestId('login-password-error').textContent()) || '';
    expect(err, 'sign-in must not complain about password length').not.toMatch(/8 characters|at least/i);
  });

  test('every practice app exposes data-testid, as the README promises', async () => {
    // README: "data-testid on every interactive element in the practice apps —
    // automation-first by design." The a11y challenge shipped with zero, so a
    // documented promise was false for one of the apps a learner is told to
    // automate. A testid is not an accessibility affordance, so adding them
    // left every seeded a11y defect intact.
    const bare = [];
    for (const f of appFiles()) {
      const src = fs.readFileSync(path.join(ROOT, 'practice-apps', f), 'utf8');
      const interactive = (src.match(/<(input|button|select|textarea)/g) || []).length;
      const testids = (src.match(/data-testid=/g) || []).length;
      if (interactive >= 3 && testids === 0) bare.push(f);
    }
    expect(bare, 'practice apps with interactive elements and no test ids').toEqual([]);
  });
  test('the app cards quote defect counts that match the catalog', async ({ page }) => {
    // The fourth hand-maintained list to be caught drifting. The Login card
    // still advertised 9 defects after pw-length was removed as not-a-defect,
    // so the site was promising a bug that no longer existed and a learner
    // could hunt for it forever. The number is derived here rather than
    // restated, which is the only version of this that stays true.
    await page.goto('/pages/practice-apps.html?reset');

    const stated = await page.evaluate(() => {
      const out = {};
      document.querySelectorAll('.app-card').forEach((card) => {
        const link = card.querySelector('a[href*="practice-apps/"]');
        const meta = card.querySelector('.app-meta');
        if (!link || !meta) return;
        const m = meta.textContent.match(/(\d+)\s+(?:known defects|seeded issues)/);
        if (m) out[link.getAttribute('href').split('/').pop()] = Number(m[1]);
      });
      return out;
    });

    await page.goto('/pages/bug-bounty.html?reset');
    const actual = await page.evaluate(() => {
      const out = {};
      Object.values(window.APP_DEFECTS).forEach((a) => {
        out[a.url.split('/').pop()] = a.defects.length;
      });
      return out;
    });

    const wrong = [];
    for (const [file, n] of Object.entries(stated)) {
      if (actual[file] === undefined) wrong.push(`${file}: card quotes a count for an app not in the catalog`);
      else if (actual[file] !== n) wrong.push(`${file}: card says ${n}, catalog has ${actual[file]}`);
    }
    // And every cataloged app must have a card at all.
    for (const file of Object.keys(actual)) {
      if (stated[file] === undefined) wrong.push(`${file}: cataloged but no card quotes its count`);
    }
    expect(wrong).toEqual([]);
  });
});
