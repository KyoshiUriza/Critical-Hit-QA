// One-off: capture reference screenshots to attach to the Gemini prompt.
const { chromium } = require('@playwright/test');
const path = require('path');

const OUT = path.join(process.cwd(), 'design-audit');
const BASE = 'http://localhost:8080';

const SHOTS = [
  { name: '01-home-dark',       url: '/index.html',                          scheme: 'dark',  w: 1440, full: true },
  { name: '02-home-light',      url: '/index.html',                          scheme: 'light', w: 1440, full: true },
  { name: '03-locator-lab',     url: '/practice-apps/locator-lab.html',      scheme: 'dark',  w: 1440, full: true },
  { name: '04-progress',        url: '/pages/progress.html',                 scheme: 'dark',  w: 1440, full: true },
  { name: '05-tester-lattice',  url: '/pages/tester-lattice.html',           scheme: 'dark',  w: 1440, full: true },
  { name: '06-home-mobile',     url: '/index.html',                          scheme: 'dark',  w: 375,  full: true },
  { name: '07-sql-sandbox',     url: '/practice-apps/sql-sandbox.html',      scheme: 'dark',  w: 1440, full: true },
  { name: '08-learn-track',     url: '/pages/learn/locators.html',           scheme: 'light', w: 1440, full: true },
];

(async () => {
  const browser = await chromium.launch();
  for (const s of SHOTS) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: 900 },
      colorScheme: s.scheme,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    // Seed some progress so dashboards aren't empty states.
    await page.addInitScript(() => {
      localStorage.setItem('qaprep_progress_v1', JSON.stringify({
        quiz: { runs: [
          { category:'manual', correct:8, total:10, elapsedMs:240000, at:'2026-08-09' },
          { category:'automation', correct:6, total:10, elapsedMs:300000, at:'2026-08-10' }
        ], byCategory: { manual:{attempted:10,correct:8,runs:1}, automation:{attempted:10,correct:6,runs:1} } },
        bugBounty: { login: ['email-regex','empty-password','user-enumeration'], cart: ['tax-basis'] },
        studyPlan: { '1-week': { 0:true, 1:true } },
        activePlan: '1-week',
        testCases: 3, bugReports: 2,
        streak: { lastDate: '2026-08-10', days: 4 }
      }));
    });
    await page.goto(BASE + s.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, s.name + '.png'), fullPage: s.full });
    console.log('captured', s.name, `(${s.scheme}, ${s.w}px)`);
    await ctx.close();
  }
  await browser.close();
})();
