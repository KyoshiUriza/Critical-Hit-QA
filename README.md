# QA Prep Hub

A self-contained, static web app for Software QA interview prep. No build step, no backend, no signup.

## What's inside

- **Home** — landing overview with feature grid and live stats.
- **Practice Tests** — timed multiple-choice quizzes with instant explanations, filterable by category. Scores recorded to your progress dashboard.
- **Interview Questions** — categorized Q&A bank with model answers, searchable and filterable by difficulty.
- **Practice Apps** — 12 interactive front-end apps:
  - **Clean builds (8):** Login, Todo, Cart, Register, Data Table, File Upload, Modal Dialog, Accessibility Challenge
  - **Buggy builds (4):** Login, Todo, Cart, Register — each seeded with real defects
- **Bug Bounty** — score your exploratory sessions against the seeded defect catalog, weighted by severity.
- **Automation Lab** — copy-paste Playwright / Cypress / Selenium examples targeting the practice apps, including a "bug-hunt regression suite" that fails against the buggy builds.
- **Test Case Builder** — form-driven test case authoring, exports as Markdown or JSON.
- **Bug Report Builder** — structured bug report authoring, exports as Markdown, GitHub Issue, or Jira format.
- **Progress Dashboard** — per-category quiz accuracy, bug bounty catch rate, streaks, drafted-artifact counts. Import/export JSON.
- **Study Plan** — 3-day, 1-week, and 1-month structured prep plans linking into every tool.
- **Resources** — HTTP cheat sheet, glossary, test techniques, reading list, interview checklist.

## Running it

No build step. Open [index.html](index.html) directly, or serve locally:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`. Serving locally is required to run the Automation Lab examples against the practice apps (many test runners refuse `file://` URLs).

## Hosting online

See [HOSTING.md](HOSTING.md) for step-by-step guides on:

- **Netlify Drop** — drag the folder to a browser, 60 seconds, done.
- **Netlify + GitHub** — automatic redeploys on push.
- **GitHub Pages** — free, GitHub-native, workflow included at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).
- **Cloudflare Pages** / **Vercel** — same shape as Netlify.

## Project structure

```
QA Website Project/
├── index.html
├── README.md
├── ROADMAP.md               # feature research & prioritization
├── HOSTING.md               # deployment guides
├── netlify.toml             # Netlify config
├── .github/workflows/deploy-pages.yml
├── css/styles.css
├── js/
│   ├── home.js
│   ├── quiz.js
│   ├── interview.js
│   ├── progress.js          # shared localStorage progress store
│   └── data/
│       ├── quiz-questions.js
│       ├── interview-questions.js
│       └── defects.js       # seeded-bug catalog for the buggy apps
├── pages/
│   ├── practice-tests.html
│   ├── interview-questions.html
│   ├── practice-apps.html
│   ├── bug-bounty.html
│   ├── automation-lab.html
│   ├── test-case-builder.html
│   ├── bug-report-builder.html
│   ├── progress.html
│   ├── study-plan.html
│   └── resources.html
└── practice-apps/
    ├── login.html            login-broken.html      (9 seeded defects)
    ├── todo.html             todo-broken.html       (6 seeded defects)
    ├── cart.html             cart-broken.html       (7 seeded defects)
    ├── register.html         register-broken.html   (9 seeded defects)
    ├── data-table.html
    ├── file-upload.html
    ├── modal.html
    └── a11y-challenge.html   (13 seeded WCAG issues)
```

## Design notes

- **Automation-first.** Every interactive element in the practice apps has a stable `data-testid` attribute so your selectors are stable across UI changes.
- **Theme-aware.** Dark by default, follows `prefers-color-scheme` for light mode.
- **No frameworks, no build tools, no external dependencies.** One folder, works offline, deploys anywhere.
- **Progress is per-browser** and stored under the `qaprep_progress_v1` localStorage key. Export/import JSON from the Progress Dashboard to move it between browsers or devices.

## Extending it

- Add quiz questions → `js/data/quiz-questions.js` (categories auto-appear in filters).
- Add interview questions → `js/data/interview-questions.js` (new categories auto-tab).
- Add practice apps → drop a new HTML file in `practice-apps/`, link it from `pages/practice-apps.html`.
- Add seeded defects → `js/data/defects.js`; they'll appear in the Bug Bounty scorer automatically.
- Add a study plan → append to the `PLANS` object in `pages/study-plan.html`.
