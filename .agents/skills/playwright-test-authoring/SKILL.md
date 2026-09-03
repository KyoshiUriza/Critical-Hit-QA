---
name: playwright-test-authoring
description: Write or refactor Playwright tests using auto-waiting, role and label locators, web-first assertions, fixtures, and Page Objects — and diagnose flaky tests. Use when writing, reviewing, or debugging Playwright specs in this repo.
---

# Playwright test authoring

## Commands

```bash
npm test                                 # full suite (playwright test)
npm test -- tests/bank.spec.js           # one spec file
npm test -- -g "deposit"                 # filter by title
npm run test:ui                          # UI mode for debugging
npm run test:report                      # last HTML report
npx playwright show-trace <trace.zip>    # inspect a recorded trace
```

The config starts and tears down the static file server itself, so do not start one first.

Never report a suite as passing without having run it and seen it pass.

## Locators, in strict order

Playwright locators are lazy handles that re-resolve on every use, so they never go stale.

1. `getByRole('button', { name: 'Submit' })` — accessibility role plus accessible name. Always first: it matches how a real user and a screen reader find the element, so it doubles as an accessibility check.
2. `getByLabel('Email')` — labelled form controls.
3. `getByPlaceholder` / `getByText` / `getByTitle` / `getByAltText`.
4. `getByTestId(...)` — elements with no meaningful role or accessible name. Every practice-app interactive element in this project exposes a stable `data-testid`; using it is correct, not a compromise.
5. CSS — only when nothing above works; say why in a comment.
6. XPath — effectively never. Absolute XPath — never.

Chain and filter instead of indexing:

```js
const row = page.getByTestId('account-row').filter({ hasText: 'Checking' });
await row.getByRole('button', { name: 'Transfer' }).click();
```

Use `.nth(0)` only when position is what is under test.

## Auto-waiting

Every action waits for the element to be attached, visible, stable, enabled, and able to receive events. Every `expect(locator)` assertion retries until it passes or times out.

```js
// good — retries until true or times out
await expect(page.getByTestId('balance')).toHaveText('$120.00');

// bad — a snapshot that cannot retry
expect(await page.getByTestId('balance').textContent()).toBe('$120.00');
```

Wait on conditions, never on durations: `page.waitForURL(...)`, `page.waitForResponse('**/api/*')`. No `waitForTimeout`, no sleeps, no polling loops, no `try/catch` around actions, no `click({ force: true })` to push past a failing actionability check — that failure is the finding.

## Structure

- One `test(...)` per behavior; the title reads as a sentence about the app.
- Group phases with `await test.step('...')` so the report and trace read like a script.
- Shared setup in a fixture (`test.extend`) or a helper; prefer fixtures when the setup produces a value the test needs.
- Page Object — a class with locators as fields and user actions as methods — once a flow is reused about three times or a test exceeds ~30 lines.
- Order-independent and parallel-safe; no shared mutable module state. State lives in `localStorage` per browser context, so clear or seed it in setup rather than relying on a previous test.
- Keep specs dependency-free, matching the project's zero-npm-dependency constraint (`@playwright/test` is the only devDependency).

## Known defects

Assert the **correct** behavior. Where the app is wrong, write the assertion for what should happen and mark it `test.fail()` with a comment naming the defect. A `test.fail()` with no documented defect behind it is hiding a bug.

## Flake

A flaky test passes and fails on the same code — treat it as a real defect:

1. Confirm the rate: `npm test -- -g "<title>" --repeat-each=20`.
2. Open the trace from a failing run; find the action that behaved differently.
3. Classify: timing not covered by auto-wait, shared state, non-determinism (dates, random, ordering), animation, or a genuine app race.
4. Fix the cause. Retries are never the fix.
5. Re-run 20–50 times to prove it.

## Repo context

`playwright.config.js` — `testDir: ./tests`, `fullyParallel: true`, chromium only, 15s timeout, `baseURL: http://localhost:8080`, `trace: 'on-first-retry'`, screenshot and video retained on failure, and a `webServer` block that serves the static site with `python -m http.server 8080`. On CI: `forbidOnly`, 1 retry, 2 workers, HTML plus GitHub reporters.

The app under test is this repo — a 100% static site with no backend and no accounts, state in `localStorage`. Unlike a third-party target, defects found here can and should be fixed in the same repo.
