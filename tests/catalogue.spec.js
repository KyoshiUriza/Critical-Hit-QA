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

test.describe('practice app catalogue', () => {
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
    const actual = appFiles().length;
    const buggy = appFiles().filter((f) => f.endsWith('-broken.html')).length;
    const clean = actual - buggy;

    await page.goto('/index.html?reset');
    const home = await page.locator('main').textContent();

    expect(home, `home page should claim ${actual} apps`).toContain(`${actual} working apps`);
    expect(home, `home page should claim ${clean} clean`).toContain(`${clean} clean`);
    expect(home, `home page should claim ${buggy} buggy`).toContain(`${buggy} with seeded defects`);

    const stat = await page.getByTestId('stat-apps').textContent();
    expect(Number(stat), 'the stats strip should agree with the hero copy').toBe(actual);
  });

  test('every buggy app has a defect catalogue entry', async ({ page }) => {
    // A -broken app with no seeded defects recorded would score as 0% forever
    // in Bug Bounty and silently teach nothing.
    await page.goto('/pages/bug-bounty.html?reset');
    const keys = await page.evaluate(() => Object.keys(window.APP_DEFECTS));
    const buggy = appFiles().filter((f) => f.endsWith('-broken.html'))
      .map((f) => f.replace('-broken.html', ''));
    for (const app of buggy) {
      expect(keys, `${app} has a buggy build but no defect catalogue`).toContain(app);
    }
  });

  test('the seeded-defect count claimed in the docs matches the catalogue', async ({ page }) => {
    // Same guard as the app count, for the same reason: removing "password
    // minimum length not enforced" from the login catalogue left README and
    // the Buy Me a Coffee copy claiming 31 when there were 30.
    await page.goto('/pages/bug-bounty.html?reset');
    const total = await page.evaluate(() =>
      Object.values(window.APP_DEFECTS).reduce((n, a) => n + a.defects.length, 0)
    );

    for (const file of ['README.md', 'docs/buy-me-a-coffee-blurb.md']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const claims = [...text.matchAll(/(\d+)\s+(?:real\s+|seeded\s+|total\s+)?defects?/gi)]
        .map((m) => Number(m[1]))
        .filter((n) => n > 5);   // ignore per-app figures and prose numbers
      for (const claim of claims) {
        expect(claim, `${file} claims ${claim} defects, catalogue has ${total}`).toBe(total);
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
    // The reference build was modelling the wrong pattern: length and
    // composition are registration-time rules. Enforcing them at sign-in adds
    // no security, leaks the policy, and locks out older accounts.
    await page.goto('/practice-apps/login.html?reset');
    await page.getByTestId('login-email').fill('demo@qa.test');
    await page.getByTestId('login-password').fill('x');
    await page.getByTestId('login-submit').click();

    const err = (await page.getByTestId('login-password-error').textContent()) || '';
    expect(err, 'sign-in must not complain about password length').not.toMatch(/8 characters|at least/i);
  });
});
