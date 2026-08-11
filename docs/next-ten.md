# Deep dive: the next ten improvements

**Date:** 2026-08-10 · **Against:** commit `13c64a6`, 283 tests passing
**Supersedes the open items in** [roadmap-research.md](roadmap-research.md) — P0
and P1 from that document shipped; P2–P4 are carried forward and re-ranked here
against new evidence.

Ranked by *evidence of need*, then by cost. Each item states what already
exists, so nothing here is a proposal to build something twice.

---

## Method

Three inputs, in this order of weight:

1. **Measured gaps in the repo.** What the code and content actually contain,
   counted rather than remembered.
2. **What hiring managers say gets candidates rejected** — the closest available
   proxy for what the site is for.
3. **Regulatory and market shifts** that change what "competent tester" means.

Sources: [why candidates get rejected](https://shiftsync.tricentis.com/software-testing-blogs-69/how-to-prepare-for-qa-interviews-in-2026-why-memorizing-answers-gets-you-rejected-2543),
[junior QA hiring guide](https://zythr.com/resources/hiring-guides/engineering-and-development-hiring-guides/junior-qa-engineer-hiring-guide),
[QA automation trends](https://quashbugs.com/blog/state-of-qa-automation-2026-report),
[mobile testing skills](https://www.sprintzeal.com/blog/mobile-testing-skills-qa-engineers),
[accessibility testing tools](https://www.browserstack.com/guide/app-accessibility-testing-tools),
[testing trends](https://testomat.io/blog/software-testing-trends/).

**Content balance is no longer a gap.** Quizzes run 6–9 per category across
eight categories; interview questions 5–7. Both were thin six sessions ago and
are not now. Adding more of either would be the easy thing rather than the
useful one, which is why no item below is "write more questions".

---

## 1. Fix the a11y Challenge — it breaks two of the site's own promises
**Evidence: measured, not argued. Cost: low.**

`README.md` states "**`data-testid` on every interactive element** in the
practice apps — automation-first by design." The Practice Apps page repeats it.
`practice-apps/a11y-challenge.html` contains **zero**.

It is also absent from `APP_DEFECTS`, so it has an answer key in prose that the
Bug Bounty scorer, the auto-detector and the character sheet all know nothing
about. A learner can work it and record nothing.

Fixing it is instrumentation plus a catalogue entry. Adding test ids does not
weaken the exercise — a `data-testid` is not an accessibility affordance, so
the seeded a11y defects survive untouched.

**This is the only item on the list that is a defect rather than an
enhancement, which is why it is first.**

## 2. Accessibility track — now a legal requirement, not a nice-to-have
**Evidence: strong external. Cost: medium.**

The EU Accessibility Act took effect in 2025, and accessibility is described in
current hiring material as mandatory coverage with litigation risk exceeding
that of breaches. The site has one a11y practice app, no Learn track, and
mentions WCAG in passing on the Resources page.

What is missing is the *method*: how to run a keyboard-only pass, what a screen
reader actually announces, which failures automated tooling catches (roughly a
third) and which it structurally cannot. The site already models this honestly
in its own suite — `contrast.spec.js` and `focus-contrast.spec.js` compute real
ratios — and that work is invisible to learners. Making it visible is cheap
teaching material with unusual credibility.

## 3. Mobile and responsive testing — the fastest-growing gap, and we have none
**Evidence: strong external. Cost: medium.**

Named repeatedly as the fastest-growing QA pain point. The site has nothing:
no viewport exercises, no touch-target checks, no orientation or
device-emulation content, no responsive defects seeded anywhere.

A single practice app plus a Learn section would cover the interview surface:
tap targets under 44px, content reflow, an element only reachable by scrolling
horizontally, a fixed header that eats half a small viewport, and orientation
change losing form state. The last is the classic and nobody tests it.

## 4. DevTools literacy — candidates are failing on elementary tasks
**Evidence: strong external. Cost: low-medium.**

Hiring managers report candidates who "cannot perform elementary tasks like
running queries, using Postman, or following console logs". The site covers
queries (SQL Sandbox) and API calls (API Lab). It does not cover **reading the
browser**.

A guided exercise: open an app, reproduce a defect, and evidence it from the
Console, the Network tab and Application storage. The login build already has a
defect that is *only* visible in storage, which this session's work made
findable — that is the seed of the exercise.

## 5. Test data and environment thinking
**Evidence: moderate external, strong first-principles. Cost: low.**

Nothing on the site addresses where test data comes from, why a shared
environment poisons results, or how to build data that does not collide. It is
also the most common cause of the flakiness the site teaches about, so the
existing material has a hole in the middle of it.

Fits as a Learn section plus quiz questions rather than an app.

## 6. Severity and priority calibration drill
**Evidence: moderate external. Cost: low.**

Carried from the previous roadmap, and reinforced: the Take-Home Simulator now
grades severity calibration, which makes a drill for it more valuable rather
than less. Present a defect, pick severity and priority, compare against a
reasoned answer with the trade-off stated. Interviewers probe this constantly;
the site asserts the distinction in three places and never drills it.

## 7. Evaluate-the-AI-test exercise
**Evidence: strong external. Cost: low.**

Carried from the previous roadmap. The interview bank now covers AI topics
well, but there is no *practice*: give a plausible AI-generated spec against a
known app and ask what it got wrong — asserting implementation rather than
intent, a locator that matches today, the missing edge case. Slots into the
Code Review Gauntlet's existing both-directions grading with no new mechanism.

## 8. Two hard practice apps: Scheduler and Live Feed
**Evidence: moderate. Cost: high.**

Carried from the previous roadmap, deliberately demoted below the items above
because it is the most expensive and the least evidenced.

- **Scheduler** — timezone and DST: naive local-time storage, a transition
  dropping or duplicating an hour, all-day events shifting by a day.
- **Live Feed** — async and races: optimistic updates that fail, a double-submit
  window, items arriving mid-scroll.

Both are genuinely valuable and neither is urgent relative to 1–4.

## 9. A "first 90 days" track
**Evidence: moderate external. Cost: low.**

The stated gap is between "can answer interview questions" and "can prevent
production defects". Everything here optimises for the interview and stops at
the offer. A short track on what the first weeks actually require — reading a
codebase you did not write, asking for access, your first bug report at a new
company, what to do when nothing is documented — is content nobody else in this
niche writes, and it is the difference between a site that gets you hired and
one that keeps you employed.

## 10. Suite health metrics for the learner's own work
**Evidence: weak external, strong internal. Cost: medium.**

The site's own suite is 283 tests with derived guards, a Linux-vs-Windows bug
caught by CI, and several tests that exist because a specific defect shipped.
None of that is teaching material. A short piece on measuring your own suite —
runtime as a tracked metric, flake rate as a number rather than a feeling,
which guards are worth writing — would be unusually concrete because every
example is real and in the repo the learner can read.

---

## Not recommended, with reasons

- **More quiz or interview questions.** Both are balanced. This is the easy
  thing, not the useful one.
- **A second SQL engine, or more SQL exercises.** Already beyond the niche norm.
- **Video.** Breaks offline and zero-dependency; large ongoing cost for one person.
- **Certificates or badges.** No hiring signal, and invites comparison to real
  certifications this is not.
- **More gamification.** ADR 0003 pulled the Lattice toward evidence
  deliberately. Streaks and leaderboards would re-open that.
- **A backend.** ADR 0002 settled this. Every feature since has been built to
  work without one, and the constraint has improved the designs rather than
  limiting them.

---

## Suggested order

**1 → 4 → 2 → 3 → 6 → 7 → 5 → 9 → 10 → 8.**

One is a defect and goes first. Four is cheap and addresses a named rejection
reason. Two and three are the strongest external signals and the largest new
surface. The rest are ordered by cost against evidence, with the two hard apps
last because they are the most expensive thing on a list where cheaper items
have better evidence.
