const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function htmlFiles() {
  const out = [];
  for (const dir of ['.', 'pages', 'pages/learn', 'practice-apps']) {
    const abs = path.join(ROOT, dir);
    for (const f of fs.readdirSync(abs)) {
      if (f.endsWith('.html')) out.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  return out;
}

const FILES = htmlFiles();

// These run against the files rather than the browser so that every page is
// covered, not just the sample the smoke suite loads. A page added without a
// policy is the realistic regression here.
test.describe('Content Security Policy', () => {
  test('every page has one', () => {
    expect(FILES.length).toBeGreaterThan(30);
    const missing = FILES.filter(
      (f) => !fs.readFileSync(path.join(ROOT, f), 'utf8').includes('Content-Security-Policy')
    );
    expect(missing, 'pages shipping without a CSP').toEqual([]);
  });

  test('the policy keeps its teeth', () => {
    // The value of this CSP is mostly in what it forbids. If a directive here
    // gets loosened, that should be a deliberate decision with a test change,
    // not something that happens quietly while fixing something else.
    const required = [
      "default-src 'self'",
      // Nothing on this site makes a network request — no fetch, XHR,
      // WebSocket or sendBeacon. So injected script has nowhere to send
      // anything, which is the single strongest line in this policy.
      "connect-src 'none'",
      "object-src 'none'",
      "frame-src 'none'",
      // Stops an injected <base> from re-pointing every relative URL on the
      // page, which would otherwise defeat 'self' entirely.
      "base-uri 'self'",
      "form-action 'self'",
    ];
    for (const f of FILES) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      for (const directive of required) {
        expect(src, `${f} is missing: ${directive}`).toContain(directive);
      }
    }
  });

  test('no page loads script or styles from a third party', () => {
    // 'self' already blocks this at runtime; this catches it at review time,
    // with a filename, instead of as a console error someone has to reproduce.
    const offenders = [];
    for (const f of FILES) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const tags = src.match(/<(script|link)[^>]*>/g) || [];
      for (const tag of tags) {
        const m = tag.match(/(?:src|href)="(https?:)?\/\/[^"]*"/);
        if (m) offenders.push(`${f}: ${tag.slice(0, 90)}`);
      }
    }
    expect(offenders, 'third-party script/style origins').toEqual([]);
  });

  test('every page sets a referrer policy', () => {
    const missing = FILES.filter(
      (f) => !/<meta name="referrer"/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))
    );
    expect(missing).toEqual([]);
  });
});

test.describe('code hygiene', () => {
  test('no eval or Function constructor in shipped code', () => {
    const jsDir = path.join(ROOT, 'js');
    const walk = (dir, acc = []) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, acc);
        else if (entry.name.endsWith('.js')) acc.push(p);
      }
      return acc;
    };
    const offenders = [];
    for (const file of walk(jsDir)) {
      const src = fs.readFileSync(file, 'utf8');
      if (/\beval\s*\(|new Function\s*\(/.test(src)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    // 'unsafe-eval' is deliberately absent from the CSP. This keeps it absent.
    expect(offenders, "files using eval — would require 'unsafe-eval'").toEqual([]);
  });

  test('the site stores nothing that looks like a credential', async ({ page }) => {
    // Progress is local and anonymous. If that ever changes, it should change
    // on purpose. A password or token in localStorage on a static site would
    // be readable by any script on the page.
    await page.goto('/index.html?reset');
    await page.goto('/pages/practice-tests.html');
    const keys = await page.evaluate(() => {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
      return out;
    });
    const blob = JSON.stringify(keys).toLowerCase();
    for (const word of ['password', 'passwd', 'secret', 'apikey', 'api_key', 'access_token']) {
      expect(blob, `localStorage contains "${word}"`).not.toContain(word);
    }
  });
});
