# QA Prep Hub

<!-- Replace USER/REPO once the remote exists. -->
[![E2E tests](https://github.com/USER/REPO/actions/workflows/e2e.yml/badge.svg)](https://github.com/USER/REPO/actions/workflows/e2e.yml)
[![Deploy](https://github.com/USER/REPO/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/USER/REPO/actions/workflows/deploy-pages.yml)

A self-contained static web app for Software QA interview prep. No build step, no backend, no signup, works offline.

**The pitch:** most QA prep gives you flashcards. This gives you broken apps with seeded defects — find them, score yourself against the catalog, then write the bug report and export it into your portfolio.

## What's inside

**The core loop**
- **Practice Apps** — 14 working mini-apps: 10 clean, 4 with intentionally seeded defects (31 total).
- **Bug Bounty** — tick off the defects you found; scored against the seeded catalog, weighted by severity.
- **Bug Report Builder** — turn a find into a real report. Exports Markdown / GitHub Issue / Jira / JSON.

**Learn & drill**
- **Learn tracks** — manual testing, automation testing, codeless (AccelQ), code-based frameworks (Playwright, Selenium), **locators & flaky tests**, and **SQL for QA**.
- **Locator Lab** — type a selector, get it graded live against a sandbox DOM: does it match, does it match the *right* element, and will it survive the next deploy. Six exercises covering strict-mode violations, generated classes and ids, positional selectors, absolute XPath, and stateful text.
- **SQL Sandbox** — a hand-rolled SQL engine (no dependencies) running real `SELECT` / `JOIN` / `GROUP BY` / `HAVING` / `DELETE` against an in-memory dataset seeded with an orphaned row and a NULL-vs-empty-string pair. Eight exercises, graded on the result so any correct approach passes.
- **Playwright Errors & CLI** — the ten errors you'll actually hit, their real causes, and a debugging order of operations.
- **Quizzes** — timed multiple-choice with instant explanations, filterable by category, deep-linkable via `?category=`.
- **Interview Questions** — curated Q&A with model answers, searchable and filterable by difficulty.
- **Automation Lab** — copy-paste Playwright / Cypress / Selenium specs that run against the practice apps, including a "bug-hunt regression suite" that fails against the buggy builds. Playwright samples are **JavaScript by default with a TypeScript toggle** that persists across pages.

**Build your portfolio**
- **Test Case Builder** — structured test case authoring, exports Markdown or JSON.
- **Study Plan** — 3-day, 1-week, and 1-month plans; your active plan and progress persist.
- **Progress Dashboard** — quiz accuracy by category, bug-hunt catch rate, streaks, drafted artifacts. Import/export JSON.
- **Resources** — HTTP cheat sheet, glossary, test techniques, reading list, interview checklist.

**Optional**
- **The Tester's Lattice** — a light RPG layer (ranks, Star-Dust, Catalysts, Signature Abilities) themed on *The Convergence Chronicles: The Resonance Lattice*. Purely cosmetic; ignoring it changes nothing.

## Running it

No build step for the site itself:

```bash
python -m http.server 8080
```

Then open http://localhost:8080. Serving locally is required to run the Automation Lab examples (test runners refuse `file://` URLs).

## Running the tests

The site has zero runtime dependencies. Playwright is a devDependency used only for the E2E suite.

```bash
npm install && npx playwright install chromium && npm test
```

The suite (`tests/`) has two halves:
- **`smoke.spec.js`** — every page renders the shared chrome, exposes a skip link, and produces **zero console errors**.
- **`regression.spec.js`** — one test per bug found in review, each asserting the *correct* behaviour so a reverted fix goes red.

CI runs both on every push and PR via [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml).

### Test hooks

Every page loads [`js/test-hooks.js`](js/test-hooks.js), which exposes:

```js
window.__qa.reset()      // clear all site-owned storage
window.__qa.seed({...})  // write a progress snapshot directly
window.__qa.snapshot()   // read current site-owned storage
```

Append `?reset` to any URL to clear state before the page initialises:

```js
await page.goto('/practice-apps/login.html?reset');
```

## Hosting

See [HOSTING.md](HOSTING.md). Netlify Drop is the 60-second path; Netlify-via-git and GitHub Pages both auto-deploy (workflow included).

## Project structure

```
QA Website Project/
├── index.html
├── README.md  ROADMAP.md  HOSTING.md
├── netlify.toml                    # publish dir, security + cache headers
├── package.json  playwright.config.js
├── .github/workflows/
│   ├── deploy-pages.yml            # GitHub Pages deploy
│   └── e2e.yml                     # Playwright suite on push + PR
├── .claude/agents/                 # 9-role agile team (see its README)
├── css/styles.css                  # tokens + all component styles
├── js/
│   ├── site-chrome.js              # single source of truth for header/footer
│   ├── test-hooks.js               # ?reset and window.__qa
│   ├── code-lang.js                # JS/TS toggle for Playwright samples
│   ├── locator-lab.js              # live selector grading
│   ├── mini-sql.js                 # dependency-free SQL engine
│   ├── sql-sandbox.js              # SQL exercise controller
│   ├── progress.js                 # localStorage state (qaprep_progress_v1)
│   ├── rpg.js                      # derived RPG layer (ranks, XP, unlocks)
│   ├── quiz.js  interview.js  home.js
│   └── data/                       # quiz-questions, interview-questions, defects
├── pages/
│   ├── learn.html + learn/{manual,automation,codeless,frameworks,locators,sql}.html
│   ├── playwright-errors.html      # errors + CLI reference
│   ├── practice-tests.html  interview-questions.html  practice-apps.html
│   ├── bug-bounty.html  automation-lab.html  resources.html
│   ├── test-case-builder.html  bug-report-builder.html
│   └── progress.html  tester-lattice.html  study-plan.html
├── practice-apps/                  # 8 clean + 4 buggy
└── tests/                          # smoke.spec.js  regression.spec.js
```

## Design constraints

These are deliberate. Breaking one requires an explicit trade-off, not a silent addition.

- **Zero runtime dependencies.** No framework, no bundler, no CDN scripts, no external fonts or stylesheets. The site works offline and satisfies a strict CSP.
- **Static only.** No backend, no accounts. State lives in `localStorage` per browser under `qaprep_progress_v1`.
- **`data-testid` on every interactive element** in the practice apps — automation-first by design.
- **One header, one footer.** [`js/site-chrome.js`](js/site-chrome.js) renders both; pages declare only `data-page` and `data-depth`. Never hand-write a nav. The nav collapses behind an accessible toggle below 1180px — a fixed-height header once let items render outside it.
- **JavaScript first.** Playwright examples default to JS; TypeScript is a toggle, not a fork. Add both variants inside a `.code-sample` wrapper with `data-lang="js"` / `data-lang="ts"`.
- **User input never touches `innerHTML`.** Use `textContent` or `createElement` + `append`.
- **Both themes are first-class.** Every color is a token with a light-mode override that meets WCAG AA.

## Extending it

- Quiz questions → append to [`js/data/quiz-questions.js`](js/data/quiz-questions.js).
- Interview questions → append to [`js/data/interview-questions.js`](js/data/interview-questions.js) (new categories auto-tab).
- Practice apps → new file in `practice-apps/`, link it from `pages/practice-apps.html`, give it `data-page="practice-app-detail" data-depth="1"` and the chrome slots.
- Locator exercises → [`js/data/locator-exercises.js`](js/data/locator-exercises.js); add a target element to the lab's sandbox.
- SQL exercises → [`js/data/sql-exercises.js`](js/data/sql-exercises.js); `check` grades the engine's result object.
- Seeded defects → [`js/data/defects.js`](js/data/defects.js); they appear in Bug Bounty and the RPG scoring automatically.
- Nav items → [`js/site-chrome.js`](js/site-chrome.js) `NAV` array, one place.
- Study plans → the `PLANS` object in `pages/study-plan.html`.
