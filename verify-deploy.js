// Post-deploy verification against the live GitHub Pages site.
//
// Local passing tests do not prove a deploy is good. Pages serves from the
// /Critical-Hit-QA/ subpath, is case-sensitive (Windows is not), and publishes only what
// the workflow assembled — so this checks the things that can only break in
// production.
//
//   node verify-deploy.js [baseUrl]
//
// Exits non-zero if anything is wrong, so it can gate a release.
//
// Note: pointing this at the LOCAL dev server will fail the "repo internals are
// not published" block, and that is correct. `python -m http.server` serves the
// whole working directory; the deploy serves only the assembled _site/. That
// difference is exactly what the block exists to detect.
const { chromium } = require('@playwright/test');

const BASE = (process.argv[2] || 'https://kyoshiuriza.github.io/Critical-Hit-QA').replace(/\/$/, '');

const PAGES = [
  '/index.html',
  '/pages/learn.html',
  '/pages/learn/locators.html',        // depth 2 — most likely to break on paths
  '/pages/practice-tests.html',
  '/pages/practice-apps.html',
  '/pages/bug-bounty.html',
  '/pages/portfolio.html',
  '/pages/bug-report-builder.html',
  '/pages/resources.html',             // the most outbound links of any page
  '/pages/account.html',               // profiles + sync codes
  '/pages/tester-lattice.html',        // character sheet
  '/pages/take-home.html',             // take-home simulator
  '/practice-apps/cart-broken.html',   // buggy app + bounty side panel
  '/practice-apps/locator-lab.html',
  '/practice-apps/sql-sandbox.html',
  '/practice-apps/login.html',
];

// Files the workflow deliberately does NOT publish. A 200 here means the
// build step regressed and the whole repo went live again.
const SHOULD_404 = [
  '/tests/smoke.spec.js',
  '/package.json',
  '/playwright.config.js',
  '/README.md',
];

let failures = 0;
function check(ok, label, detail) {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '* FAIL  ') + label + (detail ? '  — ' + detail : ''));
}

(async () => {
  console.log('Verifying deploy at ' + BASE + '\n');

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Read the nav size out of the deployed source, so this check verifies that
  // every page renders the same nav rather than that the nav is a fixed size.
  const chromeSrc = await (await ctx.request.get(BASE + '/js/site-chrome.js')).text();
  const navBlock = chromeSrc.slice(chromeSrc.indexOf('var NAV = ['), chromeSrc.indexOf('];'));
  const expectedNavCount = (navBlock.match(/\{\s*key:/g) || []).length;
  if (expectedNavCount < 5) {
    console.log('* FAIL  could not read the NAV array from the deployed site-chrome.js');
    process.exit(1);
  }
  console.log(`Deployed nav declares ${expectedNavCount} items.\n`);

  console.log('Pages render, with no console errors or failed requests:');
  for (const path of PAGES) {
    const consoleErrors = [];
    const netFailures = [];
    page.removeAllListeners('console');
    page.removeAllListeners('requestfailed');
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('requestfailed', (r) => netFailures.push(r.url().replace(BASE, '')));

    let status = 0;
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
      status = resp ? resp.status() : 0;
    } catch (e) {
      check(false, path, 'navigation failed: ' + e.message.split('\n')[0]);
      continue;
    }

    const state = await page.evaluate(() => {
      const nav = document.querySelector('.site-header nav.nav');
      return {
        chrome: !!document.querySelector('.site-header') && !!document.querySelector('.site-footer'),
        navCount: nav ? nav.querySelectorAll('a').length : 0,
        // If the stylesheet 404s the body keeps the UA default, not our token.
        styled: getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)',
        escaped: [...document.querySelectorAll('.site-header nav a')]
          .map((a) => a.getAttribute('href'))
          .filter((h) => h && h.startsWith('/') && !h.startsWith('/Critical-Hit-QA/')),
      };
    });

    // Derived from the deployed site-chrome.js rather than hard-coded. The
    // literal 10 here failed every page the moment an 11th nav item shipped —
    // reporting a correct site as broken, which is the worse failure for a
    // check whose whole job is to be believed.
    const ok = status === 200 && state.chrome && state.navCount === expectedNavCount && state.styled
               && consoleErrors.length === 0 && netFailures.length === 0 && state.escaped.length === 0;
    const detail = [
      status !== 200 ? 'HTTP ' + status : null,
      !state.chrome ? 'chrome missing (site-chrome.js did not run)' : null,
      !state.styled ? 'CSS did not load' : null,
      state.navCount !== expectedNavCount
        ? `nav has ${state.navCount} items, expected ${expectedNavCount}` : null,
      consoleErrors.length ? consoleErrors.length + ' console error(s): ' + consoleErrors[0] : null,
      netFailures.length ? 'failed request: ' + netFailures[0] : null,
      state.escaped.length ? 'link escapes subpath: ' + state.escaped[0] : null,
    ].filter(Boolean).join('; ');
    check(ok, path, detail);
  }

  console.log('\nRepo internals are NOT published:');
  for (const path of SHOULD_404) {
    const resp = await page.request.get(BASE + path).catch(() => null);
    const code = resp ? resp.status() : 0;
    check(code === 404, path, code === 404 ? '' : 'served HTTP ' + code + ' — build step regressed');
  }

  console.log('\nCore interactions work in production:');

  // The quiz is the most-used flow.
  await page.goto(BASE + '/pages/practice-tests.html?reset', { waitUntil: 'networkidle' });
  await page.getByTestId('use-all').click();
  const total = await page.locator('#question-count').inputValue();
  // Compare against the bank the page actually loaded, not a fixed floor.
  // A `> 30` threshold passed while the browser was serving a stale cached
  // quiz-questions.js — the check reported healthy on the wrong data, which
  // is the failure mode a deploy check exists to prevent.
  const bankSize = await page.evaluate(() => (window.QUIZ_QUESTIONS || []).length);
  check(bankSize > 0 && Number(total) === bankSize,
        'quiz "All" selects the full bank', total + ' of ' + bankSize);

  // The Locator Lab depends on its own data file loading.
  await page.goto(BASE + '/practice-apps/locator-lab.html?reset', { waitUntil: 'networkidle' });
  await page.getByTestId('locator-input').fill('[data-testid="signup-submit"]');
  await page.getByTestId('locator-check').click();
  const verdict = await page.getByTestId('locator-result').textContent();
  check(/Solid/.test(verdict || ''), 'Locator Lab grades a selector', (verdict || '').trim().slice(0, 40));

  // The SQL engine is hand-rolled — prove it actually runs.
  await page.goto(BASE + '/practice-apps/sql-sandbox.html?reset', { waitUntil: 'networkidle' });
  await page.getByTestId('sql-input').fill("SELECT * FROM users WHERE email = 'ada@test.example'");
  await page.getByTestId('sql-run').click();
  const sqlVerdict = await page.getByTestId('sql-verdict').textContent();
  check(/Correct/.test(sqlVerdict || ''), 'SQL Sandbox executes a query', (sqlVerdict || '').trim().slice(0, 40));

  // Artifacts must persist — this is the portfolio promise.
  await page.goto(BASE + '/pages/bug-report-builder.html?reset', { waitUntil: 'networkidle' });
  await page.locator('#br-title').fill('Deploy smoke test');
  await page.waitForTimeout(1400);
  await page.goto(BASE + '/pages/portfolio.html', { waitUntil: 'networkidle' });
  const saved = await page.getByTestId('artifact-bug-report').count();
  check(saved === 1, 'a draft autosaves and appears in the portfolio', saved + ' found');

  // The bounty drawer ships as its own file; if bounty-panel.js failed to
  // deploy, the buggy apps would render fine with the feature silently gone.
  await page.goto(BASE + '/practice-apps/cart-broken.html?reset', { waitUntil: 'networkidle' });
  const toggleCount = await page.getByTestId('bounty-toggle').count();
  check(toggleCount === 1, 'the Bug Bounty side panel mounts on buggy apps', toggleCount + ' toggle(s)');
  if (toggleCount === 1) {
    await page.getByTestId('bounty-toggle').click();
    // waitFor, not isVisible(): the drawer animates in over 250ms and a
    // no-retry snapshot races the transition — it failed here while the
    // feature worked fine.
    let panelShown = true;
    try {
      await page.getByTestId('bounty-panel').waitFor({ state: 'visible', timeout: 5000 });
    } catch (_) {
      panelShown = false;
    }
    check(panelShown, 'the panel opens and lists the checklist', panelShown ? 'open' : 'did not open');
  }

  // The font is the one asset the deploy workflow could silently omit — it
  // copies an explicit file list, and a missing woff2 degrades to the system
  // stack rather than erroring, so the site would look subtly wrong forever.
  console.log('\nSelf-hosted font:');
  const fontRes = await ctx.request.get(BASE + '/fonts/InterVariable.woff2');
  check(fontRes.status() === 200, 'InterVariable.woff2 is published', 'HTTP ' + fontRes.status());
  const fontBody = fontRes.status() === 200 ? await fontRes.body() : Buffer.alloc(0);
  check(fontBody.slice(0, 4).toString('ascii') === 'wOF2',
        'it is a real woff2, not an HTML 404 page',
        fontBody.slice(0, 4).toString('ascii') || 'empty');
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  const interUsed = await page.evaluate(() => document.fonts.check('16px Inter'));
  check(interUsed, 'the browser actually loaded Inter', interUsed ? 'loaded' : 'fell back');

  // Worth checking in production specifically: affiliate decoration runs in
  // the browser, so a script that fails to deploy leaves plain links that look
  // completely normal and silently earn nothing.
  console.log('\nAffiliate links:');
  await page.goto(BASE + '/pages/resources.html', { waitUntil: 'networkidle' });
  const aff = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[data-affiliate="amazon"]')];
    const box = document.querySelector('[data-testid="affiliate-disclosure"]');
    return {
      total: links.length,
      tagged: links.filter((a) => /[?&]tag=[^&]+/.test(a.href)).length,
      sponsored: links.filter((a) => /sponsored/.test(a.rel)).length,
      tags: [...new Set(links.map((a) => (a.href.match(/[?&]tag=([^&]+)/) || [])[1]))],
      disclosureShown: !!box && box.offsetParent !== null,
    };
  });
  check(aff.total > 0 && aff.tagged === aff.total,
        'every book link carries a tracking ID', `${aff.tagged}/${aff.total} tagged`);
  check(aff.tags.length === 1, 'one tracking ID across all links', aff.tags.join(', ') || 'none');
  check(aff.sponsored === aff.total,
        'monetised links are marked rel=sponsored', `${aff.sponsored}/${aff.total}`);
  // Undisclosed affiliate links breach the Associates Operating Agreement and
  // the FTC endorsement guides. If the links are live, this must be too.
  check(aff.tagged === 0 || aff.disclosureShown,
        'the affiliate disclosure is visible', aff.disclosureShown ? 'shown' : 'MISSING');

  console.log('\nFooter links:');
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  const links = await page.evaluate(() => {
    const f = document.querySelector('[data-testid="feedback-link"]');
    const s = document.querySelector('[data-testid="source-link"]');
    const b = document.querySelector('[data-testid="book-link"]');
    return {
      feedback: f && f.getAttribute('href'),
      source: s && s.getAttribute('href'),
      book: b && b.getAttribute('href'),
    };
  });
  check(!!links.feedback && !links.feedback.startsWith('mailto:'),
        'feedback points at Issues, not a mailto', links.feedback || 'missing');
  check(!!links.source, 'source link present', links.source || 'missing');
  check(!!links.book && links.book.includes('royalroad.com/fiction/159344/'),
        'source serial is credited and linked', links.book || 'missing');

  await browser.close();

  console.log('\n' + (failures ? failures + ' PROBLEM(S) FOUND' : 'Deploy verified — everything checks out.'));
  process.exit(failures ? 1 : 0);
})();
