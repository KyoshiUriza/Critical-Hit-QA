# QA Prep Hub — MVP Roadmap & Feature Research

*Research date: 2026-08-10*

## Executive summary

The site's current MVP delivers on the promise better than most free tools do — self-contained, no signup, quiz + interview bank + interactive apps + automation lab. But relative to what QA candidates now expect in mid-2026, three gaps stand out:

1. **No persistence.** Every session is a cold start — quiz scores reset, no history, no "what have I mastered?" This is table stakes on QA Playground, AssertHired, and PracHub.
2. **No bug-report authoring.** The site teaches the theory of a good bug report and gives buggy apps to hunt in — but has no tool for actually writing the report. The mirror of the test case builder is missing.
3. **No study structure.** The content exists but the learner has no path through it — no "day 1 → day 7" plan, no flashcards for definitions, no session goals.

Adding **five features** — progress tracking, a bug report authoring tool, a bug-bounty scorer, expanded practice apps, and a study roadmap — closes those gaps and stays within the "no backend, works offline" constraint that makes this project easy to run.

---

## Competitive scan (2026)

| Platform | Core offering | Notable |
|---|---|---|
| **QA Playground** ([qaplayground.com](https://qaplayground.com/)) | 14+ practice elements with stable selectors; AI mock interviews; framework-agnostic | Broadest practice UI catalog; no walls |
| **OnJob.io** | Free AI mock interview specifically for QA/Test Engineer role, timed | Timed simulation is the differentiator |
| **AssertHired** | AI interviewer + role-specific banks (manual, engineer) | Positions as end-to-end interview coach |
| **PracHub** | Real recently-asked interview questions with written solutions | Curated freshness beats generic banks |
| **Katalon Academy** | Free structured courses, added AI-assisted testing section in 2026 | Course structure, not quiz format |
| **Testsigma blog** | 70+ QA interview Qs (fresher → senior) | Content depth but static |
| **SDETQA.com** | Tutorials for Playwright/Selenium/Cypress with code | Framework depth |
| **play-qa.com** | Practice hub with copy-paste code for all three frameworks | Similar shape to our Automation Lab |

**Themes to steal:**
- AI mock interviews are becoming table stakes — but a static site can approximate this via scripted follow-ups without an LLM.
- Practice-element catalogs (form widgets, tables, modals) are broader than ours (4 apps vs 14+).
- Modern QA competencies now front-and-center: CI/CD integration, AI-assisted testing judgment, contract testing.

**Themes we're already competitive on:**
- Buggy variants with an answer key — genuinely unusual, most platforms only ship clean sandboxes.
- Test case authoring with export — most sites just show templates.
- Self-contained / no signup / offline-friendly — market is drifting the other way (accounts, credits, paywalls).

---

## Gap analysis — what a QA candidate actually needs

Mapped against the ISTQB Foundation syllabus + realistic 2026 interview loops:

| Need | Currently provided? | Gap |
|---|---|---|
| Learn vocabulary / definitions | ✅ Interview Qs, Resources | No spaced-repetition flashcards; no active recall |
| Practice multiple-choice at speed | ✅ Practice Tests | No history, no weak-area tracking |
| Write test cases | ✅ Test Case Builder | Fine |
| Write bug reports | ⚠️ Templates only in Interview Qs | No authoring tool with export |
| Design test plans | ❌ | No scenario-based prompts ("test X for us") |
| Practice on realistic UIs | ✅ 4 clean + 4 buggy apps | Missing: data tables, file upload, drag-drop, modals, iframes, calendar |
| Write automation | ✅ Copy-paste examples | No in-browser runner, no exercises to complete |
| Test APIs | ⚠️ One example in Automation Lab | No interactive API sandbox |
| Test accessibility | ⚠️ Mentioned in Resources | No a11y-focused practice app |
| Answer behavioral questions | ⚠️ 2 STAR-shape questions | No prompt bank + response scaffolder |
| Structure their study time | ❌ | No roadmap, no progress dashboard |
| Assemble a portfolio | ⚠️ Test Case Builder exports one at a time | No aggregate export |

---

## Proposed features — tiered by ROI

### Tier 1 — MVP additions (recommend for next iteration)

Each ships as a static-site feature using localStorage; no backend required.

#### 1. Progress tracking dashboard (`pages/progress.html`)
- **What:** persist quiz results, buggy-app hunt scores, and completed test-case drafts in `localStorage` under a `qaprep_progress` namespace. Show a dashboard with per-category quiz averages, "questions attempted vs. total", streaks, and last-session summary.
- **Why it matters:** turns the site from a set of tools into a study companion. Learners can see gaps and target them.
- **Effort:** M (1 new page + touch `js/quiz.js` to record scores). No visual redesign needed — reuse existing panel/stats-strip styles.
- **Impact:** high — every subsequent visit becomes meaningfully personalized.

#### 2. Bug report authoring tool (`pages/bug-report-builder.html`)
- **What:** mirror of the Test Case Builder but shaped for bug reports (title, environment, steps, expected vs. actual, evidence upload as pasted image, severity+priority with reasoning, attachments list). Export as Markdown or Jira-flavored / GitHub-flavored templates.
- **Why:** biggest content-to-tool gap. The Interview Qs literally teach "how to write a good bug report" but there's no form to practice on.
- **Effort:** S — clone `test-case-builder.html`, adjust fields.
- **Impact:** high — pairs directly with buggy practice apps.

#### 3. Bug bounty scorer (`js/bug-bounty.js` + `pages/bug-bounty.html`)
- **What:** structured checklist tied to each buggy app. Learner ticks off defects they think they found; site scores against the seeded defect list and shows what they missed. Persists results per app.
- **Why:** rewards the buggy-app section (currently ends at "reveal the key"). Turns exploratory testing into a measurable exercise.
- **Effort:** S — data model already exists in the answer keys; extract into a JS module both pages consume.
- **Impact:** high — makes the buggy apps genuinely testable-against.

#### 4. Expanded practice app catalog (target: reach 8 clean apps total)
- **What:** four more practice apps targeting UI patterns competitors have and we don't:
  - **Data table** — sortable, paginated, filterable, row-select (classic automation exercise)
  - **File upload** — drag-drop + click-to-pick, validation, progress bar
  - **Modal / confirm dialog** — focus trapping, ESC to close, backdrop click
  - **Accessibility challenge** — an intentionally inaccessible form for a11y-focused testing
- **Why:** competitive parity with QA Playground; each opens new automation-lab examples (waiting for dialogs, uploading files, iterating rows).
- **Effort:** M — ~1 self-contained HTML file per app, following the existing pattern.
- **Impact:** high — the practice app section is the most differentiated part of the site; broadening it broadens the whole value prop.

#### 5. Study roadmap (`pages/study-plan.html`)
- **What:** three suggested plans — **3-day cram**, **1-week prep**, **1-month deep dive** — each with day-by-day activities linking into the site's own content (Day 2: "Take the Fundamentals quiz; read 5 Manual Testing interview Qs; run exploratory session on the login buggy app"). Mark days complete; persist.
- **Why:** removes the "what do I do first?" paralysis. Ties the standalone tools into a journey.
- **Effort:** S — one static page with checklist state in localStorage.
- **Impact:** medium — helpful onboarding, especially for candidates with a specific interview date.

**Combined effort for Tier 1: ~2 focused sessions.** No backend, no new dependencies.

---

### Tier 2 — Post-MVP (higher effort or requires services)

#### 6. Flashcards / spaced repetition
- Repurpose interview Q&A into a Leitner-box or SM-2 flashcard mode. Answer "knew it / almost / didn't"; deck reshuffles on decay curve.
- Effort M; impact medium (nice-to-have; roadmap covers the "structured study" need cheaper).

#### 7. Scripted "mock interview" mode
- Not AI. Curated sequences of ~10 questions from the bank with model answers hidden. Learner types their response, gets model answer to self-evaluate against. Timer, no advancement without submitting.
- Effort S; impact medium. Cheap approximation of the AI mock interview competitors offer.

#### 8. API testing playground
- In-browser fetch client + a small mock API served from JS (like MSW) — GET/POST/PUT/DELETE with intentional edge cases (400/401/409/429). Learner asserts status codes and shapes.
- Effort M-L; impact medium. Fills the "API testing" gap in Tier 1's practice apps.

#### 9. Portfolio bundler
- Single page that gathers everything in localStorage (test cases, bug reports, quiz scores, study plan completion) and renders a printable "candidate portfolio" PDF-ready view.
- Effort S; impact medium — appeals to job seekers preparing take-homes.

#### 10. PWA / installable / offline
- Service worker + manifest. Cache all assets so the site works offline once loaded and can be added to home screen.
- Effort S; impact low-medium — "cool but not decisive" unless you're studying on a train.

#### 11. Global search
- Fuse.js-style client-side search across quiz questions, interview Qs, and resources. One search box in the header.
- Effort S; impact medium — friction reducer for repeat visitors.

---

### Tier 3 — Nice polish

- Manual theme toggle (currently follows system `prefers-color-scheme`).
- Print stylesheet for test cases / bug reports.
- Keyboard shortcuts (`?` opens help; `/` focuses search; `n`/`p` navigate quiz).
- Site map / SEO if this ever goes public.
- BDD / Gherkin quick-reference card in Resources.

---

### Explicitly NOT recommended for MVP

- **AI mock interview with real LLM** — requires backend, API keys, cost per session. Ships against the site's "self-contained, no signup" identity. Scripted mock interview (Tier 2 item 7) captures 80% of the value.
- **User accounts / sync across devices** — same reasoning. localStorage-per-browser is fine for a study tool.
- **Video / recorded content** — production cost is high; text + code is more maintainable and searchable.
- **Community-submitted questions** — requires moderation, backend, auth. Not worth the operational tax.
- **Payment / paywall / freemium tier** — the site's whole differentiator is being uncomplicated and free.

---

## Recommended next iteration

Ship Tier 1 in this order:

1. **Bug bounty scorer** — smallest, most immediately fun, closes an obvious loop with the buggy apps already built.
2. **Bug report authoring tool** — small, pairs with #1, completes the "learn → practice → deliver" arc for defect handling.
3. **Progress tracking dashboard** — medium effort, unlocks per-user memory that all future features can build on.
4. **Expanded practice app catalog** — parallelizable; each app is independent.
5. **Study roadmap** — do last so it can link into the completed dashboard and the expanded apps.

After that, revisit based on what learners actually want. The static-site constraint keeps every one of these cheap to build, cheap to maintain, and impossible to break for someone else running the project.

---

## Sources

- [QA Automation Practice Hub](https://play-qa.com/)
- [QA Playground](https://qaplayground.com/) — practice elements + AI mock interviews
- [OnJob QA/Test Engineer mock interview](https://onjob.io/mock-interview/qa-test-engineer/)
- [AssertHired QA Engineer prep](https://www.asserthired.com/for/qa-engineer)
- [PracHub 2026 mock interview rankings](https://prachub.com/resources/7-best-ai-mock-interview-platforms-in-2026-ranked-by-real-engineers)
- [Katalon QA interview questions guide 2026](https://katalon.com/resources-center/blog/qa-interview-questions)
- [Testsigma QA interview questions 2026](https://testsigma.com/blog/qa-interview-questions/)
- [SDETQA tutorials](https://sdetqa.com/)
- [My Interview Practice — QA Tester](https://myinterviewpractice.com/industries-details/information-technology/qa-tester-interview-preparation/)
