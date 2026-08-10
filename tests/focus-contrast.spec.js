// WCAG 2.4.11 — the focus indicator must reach 3:1 against the surface it sits on.
//
// The text-contrast suite cannot see this: the ring is painted OUTSIDE the
// element, over whatever surface is behind it. The previous ring was a
// translucent box-shadow, which composites toward that surface — it measured
// 2.85:1 in dark and 1.84:1 in light while a comment in the stylesheet claimed
// it passed. Nothing caught that for four sprints.
const { test, expect } = require('@playwright/test');

const PAGES = [
  'index.html',
  'pages/test-case-builder.html',
  'practice-apps/locator-lab.html',
];

function probeFocused() {
  const relLum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const ratio = (a, b) => {
    const l1 = relLum(a), l2 = relLum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // Composite a possibly-translucent ring over the surface behind it.
  const over = (fg, bg) => {
    const a = fg.length > 3 ? fg[3] : 1;
    return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
  };

  const el = document.activeElement;
  if (!el || el === document.body || !el.getClientRects().length) return null;

  // The ring sits over the nearest opaque ancestor, not the element's own fill.
  let surface = [255, 255, 255];
  for (let n = el.parentElement; n; n = n.parentElement) {
    const c = parse(getComputedStyle(n).backgroundColor);
    if (c.length >= 3 && (c.length < 4 || c[3] > 0.95)) { surface = c.slice(0, 3); break; }
  }

  const cs = getComputedStyle(el);
  const label =
    `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}> ` +
    `"${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;

  let ring = null;
  if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
    ring = parse(cs.outlineColor);
  } else {
    const m = cs.boxShadow && cs.boxShadow.match(/rgba?\([^)]+\)/);
    if (m) ring = parse(m[0]);
  }
  if (!ring || ring.length < 3) return `NO focus indicator — ${label}`;

  const r = ratio(over(ring, surface), surface);
  return r < 3 ? `${r.toFixed(2)}:1 (need 3.0) — ${label}` : null;
}

for (const scheme of ['dark', 'light']) {
  for (const path of PAGES) {
    test(`focus indicators reach 3:1 on ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`/${path}?reset`);
      await page.locator('body').click({ position: { x: 2, y: 2 } });

      const failures = new Set();
      const seen = new Set();
      // Tab-walk rather than calling .focus(): :focus-visible does not reliably
      // apply to programmatic focus on buttons in Chromium.
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab');
        const key = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? el.tagName + '|' + (el.id || '') + '|' + (el.textContent || '').slice(0, 20) : null;
        });
        if (!key || seen.has(key)) break;   // wrapped around
        seen.add(key);
        const bad = await page.evaluate(probeFocused);
        if (bad) failures.add(bad);
      }

      expect([...failures], `focus indicators below 3:1 on ${path} (${scheme})`).toEqual([]);
    });
  }
}
