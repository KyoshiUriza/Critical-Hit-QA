# Critical Hit QA

[![E2E tests](https://github.com/KyoshiUriza/Critical-Hit-QA/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/KyoshiUriza/Critical-Hit-QA/actions/workflows/e2e.yml)
[![Deploy](https://github.com/KyoshiUriza/Critical-Hit-QA/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/KyoshiUriza/Critical-Hit-QA/actions/workflows/deploy-pages.yml)

A self-contained static web app for Software QA interview prep. No build step, no backend, no signup, works offline.

**The pitch:** most QA prep gives you flashcards. This gives you broken apps with seeded defects — find them, score yourself against the catalog, then write the bug report and export it into your portfolio.

## What's inside

**The core loop**
- **Practice Apps** — 24 working mini-apps: 16 clean, 8 seeded with 60 real defects.
- **Bug Bounty** — tick off the defects you found; scored against the seeded catalog, weighted by severity.
- **Bug Report Builder** — turn a find into a real report. Exports Markdown / GitHub Issue / Jira / JSON. A defect ticked in Bug Bounty carries straight through with its app, environment and title prefilled.
- **My Portfolio** — every draft you've written, autosaved as you type. Export the lot as one Markdown document to hand to an interviewer.

**Learn & drill**
- **Learn tracks** — manual testing, automation testing, codeless (AccelQ), code-based frameworks (Playwright, Selenium), **locators & flaky tests**, **SQL for QA**, **accessibility**, **mobile & responsive**, **test data & environments**, **your first 90 days**, and **suite health**.
- **Locator Lab** — type a selector, get it graded live against a sandbox DOM: does it match, does it match the *right* element, and will it survive the next deploy. Nine exercises covering strict-mode violations, generated classes and ids, positional selectors, absolute XPath, stateful text, and elements with no good locator at all.
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

The suite (`tests/`) is five specs:

| Spec | Guards |
|---|---|
| `smoke.spec.js` | Every page renders the shared chrome, exposes a skip link, and produces **zero console errors** |
| `regression.spec.js` | One test per bug found in review, asserting the *correct* behavior so a reverted fix goes red |
| `contrast.spec.js` | WCAG AA text contrast on 8 pages × 2 themes, computed from live styles; `--on-*` token pairs; WCAG 1.4.11 control boundaries |
| `focus-contrast.spec.js` | WCAG 2.4.11 — tab-walks each page and measures the focus indicator against the surface behind it |
| `header.spec.js` | No nav item escapes the header at 10 widths (375–1440px); the collapse toggle; chip and brand never wrap |
| `labs.spec.js` | Locator Lab grading, SQL Sandbox execution, and the JS/TS code toggle |
| `portfolio.spec.js` | Draft autosave and reload, the Bug Bounty → report loop, and Markdown export |

The contrast specs exist because hand-auditing a palette does not survive a
second pass — six WCAG failures shipped despite an earlier manual fix round.

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

## Feedback

Found a bug in the site itself, or have an idea? [Open an issue](https://github.com/KyoshiUriza/Critical-Hit-QA/issues/new).
The template asks for the three things that make a report actionable — which is
the same discipline the Bug Report Builder teaches.

## Hosting

See [HOSTING.md](HOSTING.md). Netlify Drop is the 60-second path; Netlify-via-git and GitHub Pages both auto-deploy (workflow included).

## Project structure

```
QA Website Project/
├── index.html
├── README.md  ROADMAP.md  HOSTING.md
├── docs/adr/                       # architecture decisions
├── netlify.toml                    # publish dir, security + cache headers
├── package.json  playwright.config.js
├── .github/workflows/
│   ├── deploy-pages.yml            # GitHub Pages deploy
│   └── e2e.yml                     # Playwright suite on push + PR
├── .claude/agents/                 # 9-role agile team (see its README)
├── css/styles.css                  # token scales + all component styles
│                                   #   color, radius, elevation, spacing, type
├── js/
│   ├── site-chrome.js              # single source of truth for header/footer
│   ├── test-hooks.js               # ?reset and window.__qa
│   ├── code-lang.js                # JS/TS toggle for Playwright samples
│   ├── locator-lab.js              # live selector grading
│   ├── mini-sql.js                 # dependency-free SQL engine
│   ├── sql-sandbox.js              # SQL exercise controller
│   ├── progress.js                 # localStorage state (qaprep_progress_v1)
│   ├── rpg.js                      # derived RPG layer (ranks, XP, unlocks)
│   ├── builder-core.js             # autosave + artifact persistence, both builders
│   ├── portfolio.js                # artifact list and Markdown export
│   ├── quiz.js  interview.js  home.js
│   └── data/                       # quiz-questions, interview-questions, defects
├── pages/
│   ├── learn.html + learn/{manual,automation,codeless,frameworks,locators,sql}.html
│   ├── playwright-errors.html      # errors + CLI reference
│   ├── practice-tests.html  interview-questions.html  practice-apps.html
│   ├── bug-bounty.html  automation-lab.html  resources.html
│   ├── test-case-builder.html  bug-report-builder.html
│   ├── portfolio.html              # saved artifacts + export
│   └── progress.html  tester-lattice.html  study-plan.html
├── practice-apps/                  # 16 clean + 8 buggy
├── tests/                          # smoke, regression, contrast, focus-contrast,
│                                   #   header, labs
├── design-audit/                   # reference screenshots (gitignored)
└── capture-design-audit.js         # regenerates them
```

## Design constraints

These are deliberate. Breaking one requires an explicit trade-off, not a silent addition.

- **Zero runtime dependencies.** No framework, no bundler, no CDN scripts, no external fonts or stylesheets. The site works offline and satisfies a strict CSP.
- **Static only.** No backend, no accounts. State lives in `localStorage` per browser under `qaprep_progress_v1`.
- **`data-testid` on every interactive element** in the practice apps — automation-first by design.
- **One header, one footer.** [`js/site-chrome.js`](js/site-chrome.js) renders both; pages declare only `data-page` and `data-depth`. Never hand-write a nav. The nav collapses behind an accessible toggle below 1180px — a fixed-height header once let items render outside it.
- **JavaScript first.** Playwright examples default to JS; TypeScript is a toggle, not a fork. Add both variants inside a `.code-sample` wrapper with `data-lang="js"` / `data-lang="ts"`.
- **User input never touches `innerHTML`.** Use `textContent` or `createElement` + `append`.
- **Both themes are first-class.** Every color is a token with a light-mode override that meets WCAG AA, and `tests/contrast.spec.js` enforces it.
- **Everything visual is a token.** Five scales, and they are the contract:
  `--rad-xs…full` (radius tracks element size), `--shadow-sm/md/lg` (layered,
  with separate light values), `--sp-1…12` (4px grid), `--fs-xs…5xl` (type),
  and three border roles — `--border` decorative, `--border-strong` for card
  edges, `--border-control` for form controls, which needs 3:1 under WCAG
  1.4.11. Do not hardcode a px value where a scale exists.
- **`--on-*` colors are theme-aware.** A bright accent takes dark text; a dark
  accent takes light text. Getting this backwards shipped 2.76:1 buttons.

## Extending it

- Quiz questions → append to [`js/data/quiz-questions.js`](js/data/quiz-questions.js).
- Interview questions → append to [`js/data/interview-questions.js`](js/data/interview-questions.js) (new categories auto-tab).
- Practice apps → new file in `practice-apps/`, link it from `pages/practice-apps.html`, give it `data-page="practice-app-detail" data-depth="1"` and the chrome slots.
- Locator exercises → [`js/data/locator-exercises.js`](js/data/locator-exercises.js); add a target element to the lab's sandbox.
- SQL exercises → [`js/data/sql-exercises.js`](js/data/sql-exercises.js); `check` grades the engine's result object.
- Seeded defects → [`js/data/defects.js`](js/data/defects.js); they appear in Bug Bounty and the RPG scoring automatically.
- Nav items → [`js/site-chrome.js`](js/site-chrome.js) `NAV` array, one place.
- Study plans → the `PLANS` object in `pages/study-plan.html`.
- Nav items are capped by width, not taste — adding one to `NAV` may push the
  header past its collapse breakpoint. `tests/header.spec.js` measures it.

## Security

See [SECURITY.md](SECURITY.md) for the threat model, the Content Security
Policy, how to report a vulnerability, and the repository hardening checklist.

Note that the practice apps contain **intentional** vulnerabilities — that is
the point of the site. Every seeded defect is cataloged in
[`js/data/defects.js`](js/data/defects.js) before you report one.

## License

Copyright © 2026 Kyoshi Uriza. **All rights reserved** — see [LICENSE](LICENSE).

This project is **source-available, not open source**. The source is published
so it can be read, inspected, and learned from. It is not licensed for reuse,
redistribution, or rehosting, and the written content — questions, explanations,
exercises, and the Resonance Lattice material — is not licensed for use
elsewhere.

Use the [live site](https://kyoshiuriza.github.io/Critical-Hit-QA/) freely,
including to prepare for a job. That is what it is for. If you want to do
something the license does not permit,
[open an issue](https://github.com/KyoshiUriza/Critical-Hit-QA/issues) and ask.
