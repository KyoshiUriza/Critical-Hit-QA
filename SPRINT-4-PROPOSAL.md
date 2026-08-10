# Sprint 4 — Proposal & Research

*Prepared 2026-08-10, after Sprints 1–3 shipped. Inputs: Product Owner, Tech Lead, UX Designer, plus market research on 2026 QA hiring.*

---

## The headline finding

**Three roles, working independently, all named the same #1 gap: the portfolio moat is fake.**

Sprint 2 rewrote the entire home page around this promise:

> *hunt bugs → write the report → export it into your portfolio*

But `pages/bug-report-builder.html:296` and `pages/test-case-builder.html:187` only call `incrementBugReports()` / `incrementTestCases()`. That's a counter. There is **no field in `js/progress.js` that stores draft content.** Close the tab and twenty minutes of authoring is gone. The dashboard proudly reports "3 bug reports" and cannot show you a single one.

We are marketing a portfolio we do not build. That is the sprint.

---

## Market research — what changed in QA hiring

Sources at the bottom. Three findings that affect our content strategy:

1. **AI fluency is the fastest-growing expectation in the market** — demand in US job postings jumped roughly **sevenfold in two years**, faster than any other skill. Candidates aren't expected to be ML engineers, but they *are* expected to have an informed position on what AI testing tools can and can't do.

2. **The signature 2026 interview question is judgment-shaped, not definition-shaped.** The most-cited example: *"What would you never delegate to an AI testing tool?"* Strong answers cite security logic, compliance validation, and anything where expected behavior depends on business context absent from the code (PCI-DSS boundaries being the canonical case).

3. **The top complaint from QA leads:** candidates who recite a perfect definition of regression testing but can't say how they'd prioritize a regression suite with 30 minutes until release. **Textbook knowledge without applied judgment reads as a red flag.**

**Implication for us:** our 23-question quiz bank and 26 interview questions are almost entirely definitional. We are drilling exactly the thing hiring managers say is *not* the differentiator. We have **zero** questions on AI-in-testing and **zero** scenario-judgment prompts.

---

## What the team found

### Product Owner
1. **Artifacts don't persist** — the moat is advertised but not built.
2. **Question bank is too thin to survive a second visit.** 23 questions / 6 categories. Deep-link to `?category=api` and you get ~4 questions against a default run size of 10 (`js/quiz.js:29`). "Accuracy by category" is statistical noise at n=4.
3. **Zero test-design practice.** *"How would you test X?"* is the most common QA interview prompt. We train finding defects, never designing coverage.

**Recommended cut:** scale back The Tester's Lattice. 225 lines in `js/rpg.js` plus a dedicated page, surfacing in-universe vocabulary from an unrelated novel on a link a candidate may send a hiring manager.

### Tech Lead
1. **19 of 29 pages still carry app logic in inline `<script>`.** `pages/progress.html:72-333` alone is 260 lines. This pins `'unsafe-inline'` in the CSP, is untestable outside Playwright, and is where duplication now breeds.
2. **`SEVERITY_WEIGHT` triplicated** — `js/rpg.js:17`, `pages/bug-bounty.html:46`, `pages/progress.html:73`. *Verified.* Rule of three, met.
3. **The two builders are near-clones** — `addStep` / `collect` / `preview` / copy / save duplicated across both.
4. **JS-injected chrome has no fallback.** With JS off, all 29 pages have zero nav and zero footer. No `<noscript>` anywhere. Crawlers see no internal links.
5. **`__qa.seed()` bypasses the sanitizer** (`js/test-hooks.js:38`) while the import path is hardened. Self-XSS only, but it contradicts our own stated rule.
6. **Test coupled to config** — `smoke.spec.js` asserts `toHaveCount(10)` on nav links, so adding one nav item reds 25 tests at once.

> **Verification note.** The Tech Lead flagged `"1-month": 4` (`js/home.js:20`) as a latent off-by-N. **It is actually correct** — the 1-month plan genuinely has 4 entries. But checking it surfaced a *different* real bug: those entries are **weeks**, and both `js/home.js` and `pages/progress.html` render them as *"day 3 is next."* Wrong noun, real user confusion.

### UX Designer
1. **The "I found a bug — now what?" journey is broken end to end.** Three equal-weight buttons with no default (`login-broken.html:93-98`) → Bug Bounty lands at page top, not the relevant app card (no deep-link support) → the Bug Report Builder opens **completely empty**: no app, no environment, no defect carried over. Twelve fields later, "Save to progress" throws the report away.
2. **Mobile header is broken.** At ≤720px the 10 nav links plus the RPG chip stack into a column on a `position: sticky` bar. On a 375px phone the chrome eats most of the fold. No hamburger.
3. **No day-3 return hook.** The streak exists but is never a *reason* — it's one stat tile and +5 XP. Nothing anywhere says "come back tomorrow." The study plan is the only date-shaped object on the site and it ignores dates entirely.

---

## Sprint 4 — recommendation

Three themes. The first is non-negotiable; it is the promise we already made.

### Theme 1 — Make the portfolio real *(the moat)*

| Item | What | Effort |
|---|---|---|
| **1.1** | Add `artifacts[]` to `js/progress.js` — store full bug report and test case drafts, not counters. Versioned, sanitized on read, same as the import path. | M |
| **1.2** | **Autosave drafts.** Both builders lose everything on refresh today. | S |
| **1.3** | **"My Artifacts"** — list, reopen, edit, delete. Plus **Export All** as one Markdown portfolio doc. | M |
| **1.4** | **Close the loop.** `bug-bounty.html?app=login-broken` deep link; prefill the Bug Report Builder from a ticked defect (app, environment, title seed). | M |

**Why now:** every other feature is decoration if the thing we advertise doesn't work.

### Theme 2 — Content that matches what interviews actually test

| Item | What | Effort |
|---|---|---|
| **2.1** | **Quiz bank 23 → ~120** (20/category). Makes deep links and per-category accuracy statistically honest. | M |
| **2.2** | **New category: AI in Testing.** Directly targets the fastest-growing skill demand in the market. Anchor question: *"What would you never delegate to an AI testing tool?"* | S |
| **2.3** | **Test Design Gym** — 12 *"how would you test X?"* prompts with a technique scaffold (BVA / EP / state transition / risk). Output saves into the Theme 1 artifact store. | S |
| **2.4** | **Scenario-judgment questions** — "30 minutes to release, how do you prioritize the regression suite?" This is the exact gap hiring managers name. | S |

**Why now:** we are currently drilling definitions, which the research says is explicitly *not* the differentiator.

### Theme 3 — Structural debt with a deadline

| Item | What | Effort |
|---|---|---|
| **3.1** | Extract inline scripts → `js/pages/*.js`; add `js/constants.js` for the triplicated `SEVERITY_WEIGHT` and plan lengths. Then **drop `'unsafe-inline'` from the CSP.** | L |
| **3.2** | `js/builder-core.js` shared by both builders — prerequisite for 1.1–1.3 anyway. | S |
| **3.3** | Collapsible mobile header below 720px. | S |
| **3.4** | `<noscript>` fallback nav; assert nav count from `SiteChrome.NAV.length` instead of a hardcoded 10. | S |
| **3.5** | Route `__qa.seed()` through the sanitizer; fix the "day" vs "week" label bug. | S |

---

### Suggested ordering

```
3.2 builder-core  →  1.1 artifact store  →  1.2 autosave  →  1.3 My Artifacts
                                                          →  1.4 loop closure
2.2 + 2.4 (content, parallelizable at any point)
3.3 + 3.4 + 3.5 (small, independent)
2.1 quiz bank expansion (content grind, run last or in parallel)
3.1 CSP hardening (large; defer to Sprint 5 if Theme 1 slips)
```

**If the sprint must shrink:** ship Theme 1 complete plus 2.2 and 3.3. Theme 1 alone justifies the sprint.

---

## Deferred, with reasons

| Item | Why not now |
|---|---|
| **Scripted mock interview** | Depends on a 26-question bank — it'd serve the same 10 questions every time. Nearly free *after* 2.1. |
| **API testing playground** | L effort for a simulated API. Candidates practice APIs in Postman against real endpoints; a JS-mocked one teaches nothing transferable. Lowest ROI. |
| **Global search** | Solves a discoverability problem a 20-page site with visible nav doesn't have. Revisit past ~200 content items. |
| **Flashcards / spaced repetition** | Overlaps 2.1 and the Study Plan. Reassess once the bank is deep enough to warrant scheduling. |
| **Real-LLM mock interview** | Needs a backend and per-session cost. Breaks the static/offline/no-signup constraint that is itself a market differentiator. |

---

## The one open product decision

**Does The Tester's Lattice stay?**

The PO argues to cut it: 225 lines of maintenance, every new defect or quiz category needs RPG scoring wired in, and in-universe fantasy vocabulary sits on a link a candidate may send to a hiring manager.

The counter: it's already built, Sprint 2 demoted it to an opt-in teaser, and the streak mechanic is the only retention hook that exists.

**My recommendation — a middle path.** Keep the XP/streak engine, since Theme 3's return hooks depend on it. Retire the *in-universe naming* from user-facing copy (Star-Dust → Points, Catalysts → Milestones), and keep the lore as an optional theme toggle. That preserves retention and maintenance value while removing the professional-credibility risk on a portfolio link.

**This is a product call, not an engineering one.** It needs an explicit decision before Theme 1 starts, because the artifact export will carry whatever vocabulary we choose.

---

## Sources

- [QA Automation Interviews: What to Expect in 2026 — Artech](https://www.artech.com/blog/qa-automation-interview-prep-guide-2026/)
- [AI Testing Interview Questions 2026 — Software Test Pilot](https://softwaretestpilot.com/blog/ai-in-testing/ai-testing-interview-questions)
- [QA Job Market Report 2026 — Software Test Pilot](https://softwaretestpilot.com/qa-job-market-report)
- [60+ QA Interview Questions & Answers: 2026 Guide — Katalon](https://katalon.com/resources-center/blog/qa-interview-questions)
- [QA Automation Engineer in 2026: Trends, Skills, Career Strategies — Refonte Learning](https://www.refontelearning.com/blog/qa-automation-engineer-in-2026-essential-trends-skills-and-career-strategies)
- [QA Engineer Interview Questions 2026 — KORE1](https://www.kore1.com/qa-engineer-interview-questions/)
- [Top 10 QA Interview Questions and Answers for 2026 — The Interview Guys](https://blog.theinterviewguys.com/quality-assurance-interview-questions-and-answers/)
