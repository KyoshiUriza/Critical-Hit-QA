# Feature review and roadmap research

**Date:** 2026-08-10 · **Against:** commit `94b89fe`, 271 tests passing

A review of what the app currently does, grounded research on what QA hiring
actually asks for, and a prioritised list of what to build next. Recommendations
are checked against the existing feature set first — several obvious-sounding
ideas are already built, and are listed as such rather than proposed again.

---

## 1. What exists today

**Practice (17 apps)**
| App | Teaches |
|---|---|
| login / todo / cart / register | CRUD, validation, state — each with a buggy twin |
| Component Gauntlet | 17 widgets: frames, popups, hover, drag, shadow DOM, pagination |
| Meridian Bank | money arithmetic, transfers, step-up auth, statement filtering |
| API Lab | REST semantics offline — 422 vs 409, 401 vs 403, idempotency |
| SQL Sandbox | real query engine, orphan rows, NULL traps |
| Locator Lab | live selector grading, now incl. no-test-id exercises |
| a11y Challenge, Data Table, File Upload, Modal | focused single-skill targets |

**Learning:** 7 Learn tracks, Playwright Errors, Automation Lab (3 frameworks),
Code Review Gauntlet, Install-Playwright walkthrough.

**Assessment:** 57 quiz questions across 8 categories, 46 interview questions,
30 seeded defects with auto-detection, Bug Bounty scoring.

**Output:** Bug Report / Test Case builders, Code Review artifacts, portfolio
export to Markdown.

**Meta:** profiles + sync codes, character sheet with 11 evidence-derived skills,
study plans, progress dashboard.

---

## 2. Research findings

Sources: [take-home and hiring-loop practice](https://www.asserthired.com/blog/top-20-qa-interview-questions-2026),
[QA interview guides 2026](https://www.kore1.com/qa-engineer-interview-questions/),
[Playwright interview topics](https://testdino.com/playwright-interview-questions-answers-2026),
[edge-case testing](https://www.virtuosoqa.com/post/edge-case-testing),
[timezone testing](https://trailheadtechnology.com/handling-time-zone-challenges-in-software-testing/),
[infinite scroll testing](https://qapractices.com/test-cases/infinite-scroll-pagination-test-cases/).

**Finding 1 — the take-home stage is not simulated.**
The most-cited modern format is a ~90-minute assignment: here is a flawed app,
run an exploratory session, submit a bug report and a test plan. The site has
every *component* of this (buggy apps, charters, builders, portfolio export) and
no *assembly* of it — no brief, no clock, no submission, no rubric. This is the
largest single gap, and it is mostly composition rather than new building.

**Finding 2 — interviewers grade the talking, not the artifact.**
Repeatedly: "watching how you think", "architecture and trade-offs, not 'I have
written tests'". The Code Review Gauntlet's free-text box is the only place the
site asks a learner to *articulate* anything. Everything else is
multiple-choice or a form.

**Finding 3 — Playwright MCP and AI test generation are live 2026 topics.**
Partly addressed today (added to the interview bank this session), but there is
no *practice* around evaluating AI-generated tests — which is the skill, not the
trivia.

**Finding 4 — the hardest real-world domains are under-represented.**
Time zones and DST, race conditions and double-submit, infinite scroll and
virtualised lists, file download verification, multi-jurisdiction rounding.
Meridian Bank covers rounding; the rest are absent. These are also where the
memorable interview stories come from.

---

## 3. Recommendations, in priority order

### P0 — Take-Home Simulator
*The gap with the clearest line to the user's goal of getting hired.*

A briefed, timed, submitted exercise. Pick a scenario, get a written brief and a
90-minute clock, run an exploratory session against a buggy app, then submit a
bug report plus a short test plan. On submit, grade against the seeded catalogue
by severity, and show a rubric covering what an interviewer looks for: coverage,
severity accuracy, report clarity, whether critical defects were prioritised.
Output goes to the portfolio as a third artifact type.

Mostly composition — buggy apps, defect catalogue, builders, portfolio export
and auto-detection all exist. New: the brief, the timer, the rubric, the
submission flow.

### P1 — Spoken-answer practice
*Addresses Finding 2, which no current feature touches.*

Interview questions gain an "answer before revealing" mode: a prompt, a timer, a
text box, and only then the model answer plus a self-scoring checklist ("did you
name a trade-off? give a concrete example? say what you would check first?").
Low build cost — the question bank and the reveal mechanism already exist.

### P2 — Two hard practice apps

**Scheduler** — timezone and DST. Book a meeting across zones; show it to
attendees in three different ones. Seed the classic defects: naive local-time
storage, DST transition dropping or duplicating an hour, all-day events shifting
by a day, "ends before it starts" across a boundary. Nothing on the site
currently teaches this and it is a perennial source of production incidents.

**Live Feed** — async and race conditions. Infinite scroll, optimistic updates
that can fail, a double-submit window, and items arriving while you scroll. Seed
duplicate-on-retry, lost update on concurrent edit, and a scroll handler that
double-fires. Pairs with the "dynamic loading" section of the Component
Gauntlet, which only covers the easy case.

### P3 — Evaluate-the-AI-test exercise
Give the learner a plausible AI-generated spec against a known app and ask what
it got wrong — asserting implementation rather than intent, missing the edge
case, a locator that matches today. Slots into the Code Review Gauntlet's
existing both-directions grading with no new mechanism.

### P4 — Smaller additions
- **Download verification** in the Component Gauntlet (`waitForEvent('download')` is commonly asked and absent).
- **Severity calibration drill** — given a defect, pick severity/priority and compare against a reasoned answer. Interviewers probe this constantly; the site asserts the distinction but never drills it.
- **Quiz gap-fill** — Fundamentals and Manual Testing sit at 8 and 7 while Automation and AI are at 9 and 8.

---

## 4. Explicitly not recommended

- **A second SQL engine or more SQL exercises.** Eight exercises against a real
  engine is already beyond what most competitors offer; depth here has hit
  diminishing returns relative to the gaps above.
- **Video content.** Breaks the offline guarantee, breaks the zero-dependency
  constraint, and is a large ongoing production cost for a solo project.
- **A "certification" or badge.** The character sheet already tracks evidence.
  A certificate nobody recognises adds no hiring signal and invites the
  comparison to real certifications, which this is not.
- **More gamification.** ADR 0003 deliberately pulled the Lattice back toward
  evidence. Adding streak mechanics or leaderboards would re-open a decision
  made for good reasons.

---

## 5. Done this session

Interview bank 36 → 46, targeting the three thinnest categories and the 2026
topics identified above:

- **API Testing** 3 → 6: untestable state, 200-with-empty-array, eventual consistency
- **Agile & Process** 3 → 6: skipping regression, "that's not a bug", the 80%-coverage demand
- **Performance** 3 → 5: slow-network testing, investigating a latency regression
- **AI in Testing** 5 → 7: Playwright MCP and its failure modes, responding to "replace QA with AI"

Every added answer follows the bank's existing shape — the reasoning and the
trade-off, not a definition — and several close with what the interviewer is
actually listening for, which is the part candidates most often miss.
