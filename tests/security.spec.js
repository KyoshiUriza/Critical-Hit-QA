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
// One page relaxes frame-src, on purpose and no further than 'self': the
// Component Gauntlet embeds a same-origin practice frame, because frame
// switching is one of the most-asked automation skills and cannot be taught
// without a frame. Every other page stays at 'none'.
const FRAME_EXCEPTION = 'practice-apps/component-gauntlet.html';

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

      // frame-src is handled separately so the one exception is explicit
      // rather than absent from the required list.
      const expected = f === FRAME_EXCEPTION ? "frame-src 'self'" : "frame-src 'none'";
      expect(src, `${f} should declare ${expected}`).toContain(expected);
    }
  });

  test('the frame-src exception cannot spread or widen', () => {
    // Two failure modes worth catching separately: another page quietly
    // gaining a frame, and this page widening beyond same-origin.
    // Read the policy out of the meta tag, not the file. Matching raw text
    // caught the explanatory HTML comment above the tag, which mentions both
    // 'self' and 'none' — the test failed on prose rather than on policy.
    const policyOf = (f) => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const m = src.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
      return m ? m[1] : '';
    };

    const relaxed = FILES.filter((f) => /frame-src (?!'none')/.test(policyOf(f)));
    expect(relaxed, 'pages relaxing frame-src').toEqual([FRAME_EXCEPTION]);

    const value = (policyOf(FRAME_EXCEPTION).match(/frame-src ([^;]+)/) || [])[1].trim();
    expect(value, 'the exception must stay same-origin only').toBe("'self'");

    // And the frame it embeds must itself be a same-origin relative path.
    const html = fs.readFileSync(path.join(ROOT, FRAME_EXCEPTION), 'utf8');
    const frameSrc = (html.match(/<iframe[^>]*\ssrc="([^"]+)"/) || [])[1];
    expect(frameSrc, 'iframe src should be relative').toBeTruthy();
    expect(/^https?:|^\/\//.test(frameSrc), 'iframe must not point off-origin').toBe(false);
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
