# QA Prep Hub

A self-contained, static web app for Software QA interview prep.

## What's inside

- **Home** — landing page overview.
- **Practice Tests** — timed multiple-choice quizzes with instant explanations. Filterable by category (fundamentals, manual, automation, API, agile, performance).
- **Interview Questions** — categorized Q&A with model answers, searchable and filterable by difficulty.
- **Practice Apps** — eight mini-apps: four fully-working *clean* builds plus four *buggy* mirrors with intentional, catalogable defects.
  - Login form (clean + buggy: 9 seeded defects)
  - Todo list (clean + buggy: 6 seeded defects)
  - Shopping cart (clean + buggy: 7 seeded defects)
  - Registration form (clean + buggy: 9 seeded defects)

  Clean builds are for writing positive test cases and driving your automation.
  Buggy builds are for practicing exploratory testing and bug-report writing —
  each page has an "answer key" you can reveal after you've drafted your list.
- **Automation Lab** — copy-paste Playwright, Cypress, and Selenium examples targeting the practice apps, plus a REST API example.
- **Test Case Builder** — form-driven test case authoring that exports as Markdown or JSON.
- **Resources** — HTTP status cheat sheet, glossary, test technique reference, reading list, interview checklist.

## Running it

No build step. Just open `index.html` in a browser, or serve it locally:

```bash
# Python
python -m http.server 8080

# Node
npx serve -p 8080
```

Then visit http://localhost:8080

Serving locally is required if you want to run the Automation Lab examples against the practice apps (many test runners refuse `file://` URLs).

## Project structure

```
QA Website Project/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── home.js
│   ├── quiz.js
│   ├── interview.js
│   └── data/
│       ├── quiz-questions.js
│       └── interview-questions.js
├── pages/
│   ├── practice-tests.html
│   ├── interview-questions.html
│   ├── practice-apps.html
│   ├── automation-lab.html
│   ├── test-case-builder.html
│   └── resources.html
└── practice-apps/
    ├── login.html            # clean build
    ├── login-broken.html     # buggy variant (9 seeded defects)
    ├── todo.html
    ├── todo-broken.html      # buggy variant (6 seeded defects)
    ├── cart.html
    ├── cart-broken.html      # buggy variant (7 seeded defects)
    ├── register.html
    └── register-broken.html  # buggy variant (9 seeded defects)
```

## Design notes

- Every interactive element in the practice apps has a stable `data-testid` attribute — automation-first.
- Dark theme by default, follows `prefers-color-scheme` in supported browsers.
- No frameworks, no build tools, no external dependencies — one folder, works offline.

## Extending it

- Add quiz questions in `js/data/quiz-questions.js` — just push objects into the array.
- Add interview questions in `js/data/interview-questions.js` — new categories appear as tabs automatically.
- Add practice apps by creating a new file in `practice-apps/` and linking to it from `pages/practice-apps.html`.
