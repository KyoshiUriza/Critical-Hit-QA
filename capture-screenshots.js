/*
 * Captures a screenshot of every page in the app.
 *
 * Pages are discovered from the filesystem rather than listed here. The old
 * capture script hard-coded eight URLs, which meant the set silently went
 * stale every time a page was added — and a screenshot set that quietly omits
 * pages is worse than none, because it looks complete.
 *
 *   node capture-screenshots.js                 # dark, 1280px, every page
 *   node capture-screenshots.js --light         # light theme instead
 *   node capture-screenshots.js --both          # both themes
 *   node capture-screenshots.js --mobile        # also capture at 375px
 *   node capture-screenshots.js --base http://localhost:8791
 *
 * Needs the site being served. Any static server will do:
 *   npx http-server -p 8791 -s
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'screenshots');

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const baseIdx = argv.indexOf('--base');
const BASE = baseIdx !== -1 ? argv[baseIdx + 1] : 'http://localhost:8791';

const SCHEMES = flag('--both') ? ['dark', 'light'] : [flag('--light') ? 'light' : 'dark'];
const DESKTOP_WIDTH = 1280;

// Seeded so dashboards, the portfolio and the RPG chip show real state instead
// of empty-state copy. An empty-state screenshot tells you nothing about the
// design of the thing you are trying to review.
const SEED = {
  quiz: {
    runs: [
      { category: 'manual', correct: 8, total: 10, elapsedMs: 240000, at: '2026-08-08' },
      { category: 'automation', correct: 6, total: 10, elapsedMs: 300000, at: '2026-08-09' },
      { category: 'sql', correct: 9, total: 10, elapsedMs: 180000, at: '2026-08-10' }
    ],
    byCategory: {
      manual: { attempted: 10, correct: 8, runs: 1 },
      automation: { attempted: 10, correct: 6, runs: 1 },
      sql: { attempted: 10, correct: 9, runs: 1 }
    }
  },
  bugBounty: { login: ['email-regex', 'empty-password', 'user-enumeration'], cart: ['tax-basis'] },
  studyPlan: { '1-week': { 0: true, 1: true, 2: true } },
  activePlan: '1-week',
  artifacts: [
    {
      id: 'seed1', type: 'bug-report', title: 'Cart total ignores quantity above 1',
      fields: {
        summary: 'Line total does not multiply by quantity',
        steps: '1. Add any item\n2. Set quantity to 3\n3. Observe the line total',
        expected: 'Line total is unit price x 3',
        actual: 'Line total stays at the unit price'
      },
      createdAt: 1754800000000, updatedAt: 1754830000000
    },
    {
      id: 'seed2', type: 'test-case', title: 'Login rejects an unverified account',
      fields: { preconditions: 'Account exists, email unverified', steps: '1. Sign in', expected: 'Blocked with a clear message' },
      createdAt: 1754700000000, updatedAt: 1754710000000
    }
  ],
  bugReports: 1,
  testCases: 1,
  streak: { lastDate: '2026-08-10', days: 4 }
};

function discoverPages() {
  const out = [];
  for (const dir of ['.', 'pages', 'pages/learn', 'practice-apps']) {
    const abs = path.join(ROOT, dir);
    for (const f of fs.readdirSync(abs).sort()) {
      if (!f.endsWith('.html')) continue;
      const rel = (dir === '.' ? '' : dir + '/') + f;
      out.push({
        url: '/' + rel,
        // pages/learn/locators.html -> learn-locators
        name: rel.replace(/\.html$/, '').replace(/^pages\//, '').replace(/\//g, '-')
      });
    }
  }
  return out;
}

(async () => {
  const pages = discoverPages();
  fs.mkdirSync(OUT, { recursive: true });

  // Clear stale files so a removed page does not leave an orphan behind
  // pretending to still be part of the app.
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  }

  const browser = await chromium.launch();
  const captured = [];
  const problems = [];

  for (const scheme of SCHEMES) {
    const widths = [{ w: DESKTOP_WIDTH, tag: '' }];
    if (flag('--mobile')) widths.push({ w: 375, tag: '-mobile' });

    for (const { w, tag } of widths) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: 900 },
        colorScheme: scheme,
        deviceScaleFactor: 1
      });
      await ctx.addInitScript((seed) => {
        localStorage.setItem('qaprep_progress_v1', JSON.stringify(seed));
      }, SEED);

      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      for (const p of pages) {
        errors.length = 0;
        const schemeTag = SCHEMES.length > 1 ? '-' + scheme : '';
        const file = p.name + schemeTag + tag + '.png';
        try {
          const res = await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 20000 });
          if (!res || !res.ok()) throw new Error('HTTP ' + (res ? res.status() : 'no response'));
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(OUT, file), fullPage: true });
          captured.push(file);
          if (errors.length) problems.push(`${p.url} (${scheme}${tag}): ${errors[0]}`);
          process.stdout.write('.');
        } catch (err) {
          problems.push(`${p.url} (${scheme}${tag}): ${err.message}`);
          process.stdout.write('x');
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  const bytes = captured.reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(`\n\n${captured.length} screenshots of ${pages.length} pages -> screenshots/`);
  console.log(`total ${(bytes / 1024 / 1024).toFixed(1)} MB`);

  if (problems.length) {
    console.log(`\n${problems.length} problem(s) — a page that errors while being`);
    console.log('photographed is a page that errors for a visitor:');
    problems.forEach((p) => console.log('  ' + p));
    process.exit(1);
  }
  console.log('No page failed to load and none logged a console error.');
})();
