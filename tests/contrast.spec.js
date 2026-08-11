// Automated WCAG 2.1 contrast checking against live computed styles.
//
// Why this exists: Sprint 1 fixed measured contrast failures by hand, and four
// MORE shipped undetected until a design review forced a recount — every
// dark-mode primary button was rendering white-on-#4f9dff at 2.76:1. Hand
// auditing a palette does not scale past one pass. This does it every run.
//
// It reads real computed styles from the rendered page, so it catches
// regressions from token changes, component CSS, and inline styles alike.
const { test, expect } = require('@playwright/test');

const PAGES = [
  'index.html',
  'pages/progress.html',
  'pages/practice-tests.html',
  'pages/practice-apps.html',
  'pages/automation-lab.html',
  'pages/tester-lattice.html',
  // The storefront chrome is new visual surface with its own accent, its
  // own badges and a sale/stock color language. New surface gets measured.
  'practice-apps/cart.html',
  'practice-apps/login.html',
  'practice-apps/todo.html',
  'practice-apps/bank.html',
  'practice-apps/scheduler-broken.html',
  'practice-apps/live-feed-broken.html',
  'practice-apps/register.html',
  'practice-apps/cart-broken.html',
  'practice-apps/locator-lab.html',
  'practice-apps/sql-sandbox.html',
];

// Runs in the page. Walks every element holding its own text, resolves the
// nearest opaque background, and computes the WCAG ratio.
function auditContrast() {
  const relLum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);

  // Walk up until we find something actually painted.
  const opaqueBg = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c.length < 4 || c[3] > 0.95)) return c.slice(0, 3);
    }
    const body = parse(getComputedStyle(document.body).backgroundColor);
    return body.length >= 3 ? body.slice(0, 3) : [255, 255, 255];
  };

  const failures = [];
  for (const el of document.querySelectorAll('body *')) {
    // Only elements with their own visible text.
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join('');
    if (!ownText) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (!el.getClientRects().length) continue;

    // Text over a gradient can't be measured by luminance alone. The guard has
    // to look at ANCESTORS, not just this element: every gradient container on
    // the site (.rpg-chip, .rpg-hero, .next-action, .resume-card) is
    // transparent-with-a-background-image, and its text lives in child spans
    // whose own backgroundImage is 'none'. Checking only the element let those
    // through and measured them against the surface *below* the gradient —
    // reporting a confident, wrong number instead of skipping.
    let overGradient = false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const bi = getComputedStyle(n).backgroundImage;
      if (bi && bi !== 'none') { overGradient = true; break; }
    }
    if (overGradient) continue;

    // Parent opacity fades text the walker would otherwise read at full
    // strength (.rpg-achievement renders locked at opacity: 0.6).
    let faded = false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (parseFloat(getComputedStyle(n).opacity) < 0.99) { faded = true; break; }
    }
    if (faded) continue;

    const fg = parse(cs.color).slice(0, 3);
    if (fg.length < 3) continue;

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = isLarge ? 3 : 4.5;

    const l1 = relLum(fg);
    const l2 = relLum(opaqueBg(el));
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    if (ratio < required) {
      failures.push(
        `${ratio.toFixed(2)}:1 (need ${required}) — <${el.tagName.toLowerCase()}` +
        `${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}> ` +
        `"${ownText.slice(0, 40)}"`
      );
    }
  }
  return [...new Set(failures)];
}

for (const scheme of ['dark', 'light']) {
  test.describe(`contrast — ${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`${path} meets WCAG AA`, async ({ page }) => {
        await page.goto(`/${path}?reset`);
        const failures = await page.evaluate(auditContrast);
        expect(failures, `WCAG AA failures on ${path} (${scheme})`).toEqual([]);
      });
    }
  });
}

// Buttons put text on a colored background, which the walker above handles,
// but they only render in some states. Assert the token pairs directly so a
// bad --on-* value fails even if no button of that variant is on screen.
test.describe('button label contrast (token pairs)', () => {
  for (const scheme of ['dark', 'light']) {
    test(`--on-* pairs pass AA in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/index.html?reset');

      const results = await page.evaluate(() => {
        const relLum = (rgb) => {
          const [r, g, b] = rgb.map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const val = (name) => {
          const probe = document.createElement('span');
          probe.style.color = `var(${name})`;
          document.body.appendChild(probe);
          const c = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
          probe.remove();
          return c;
        };
        const ratio = (a, b) => {
          const l1 = relLum(a), l2 = relLum(b);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        };
        return [
          ['btn-primary', ratio(val('--on-accent'), val('--accent'))],
          ['btn-success', ratio(val('--on-accent-2'), val('--accent-2'))],
          ['btn-danger', ratio(val('--on-danger'), val('--danger'))],
          ['warn badge', ratio(val('--on-warn'), val('--warn'))],
        ].map(([name, r]) => ({ name, ratio: +r.toFixed(2) }));
      });

      const failures = results.filter((r) => r.ratio < 4.5);
      expect(
        failures,
        `token pairs below AA in ${scheme}: ${JSON.stringify(results)}`
      ).toEqual([]);
    });
  }
});

// WCAG 1.4.11 — non-text contrast. A form control's border is what identifies
// it as a control, so it needs 3:1 against both its own fill and the surface
// behind it. The text walker above cannot see this.
test.describe('control boundary contrast (WCAG 1.4.11)', () => {
  for (const scheme of ['dark', 'light']) {
    test(`form controls have a 3:1 boundary in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/pages/test-case-builder.html?reset');

      const results = await page.evaluate(() => {
        const relLum = (rgb) => {
          const [r, g, b] = rgb.map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
        const ratio = (a, b) => {
          const l1 = relLum(a), l2 = relLum(b);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        };
        const out = [];
        for (const el of document.querySelectorAll('.form-field input, .form-field select, .form-field textarea')) {
          if (!el.getClientRects().length) continue;
          const cs = getComputedStyle(el);
          if (parseFloat(cs.borderTopWidth) === 0) continue;
          const border = parse(cs.borderTopColor);
          const fill = parse(cs.backgroundColor);
          // Surface behind the control.
          let behind = [255, 255, 255];
          for (let n = el.parentElement; n; n = n.parentElement) {
            const c = (getComputedStyle(n).backgroundColor.match(/[\d.]+/g) || []).map(Number);
            if (c.length >= 3 && (c.length < 4 || c[3] > 0.95)) { behind = c.slice(0, 3); break; }
          }
          const vsFill = ratio(border, fill);
          const vsBehind = ratio(border, behind);
          if (Math.min(vsFill, vsBehind) < 3) {
            out.push(`${el.tagName.toLowerCase()}#${el.id || '?'} border ${vsFill.toFixed(2)}:1 vs fill, ${vsBehind.toFixed(2)}:1 vs surface`);
          }
        }
        return [...new Set(out)];
      });

      expect(results, `control boundaries below 3:1 in ${scheme}`).toEqual([]);
    });
  }
});
