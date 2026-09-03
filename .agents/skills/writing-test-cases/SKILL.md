---
name: writing-test-cases
description: Write test cases with checkable expected results, priorities, and coverage across positive, negative, boundary, security, accessibility, and usability lenses. Use when asked what to test, for test cases for a feature, or to review or sharpen existing cases.
---

# Writing test cases

A test case is one behavior, stated so precisely that two different people executing it reach the same verdict.

## Before writing

1. Read the existing automated specs and any notes or known-issues file, and list what is already covered. Do not duplicate it.
2. State the feature's purpose, its users, and what would hurt most if it broke. Priority is assigned against that, not against how interesting the case is.

## Format

```
ID:        TC-<AREA>-<NN>
Title:     One sentence describing user-visible behavior
Priority:  P1 blocks release | P2 important | P3 nice to have
Type:      Positive | Negative | Boundary | Security | Accessibility | Usability
Pre-req:   Starting state, e.g. "fresh browser, no saved data"
Steps:     1. ...  2. ...   (actions a person performs; no interpretation needed)
Expected:  What appears, changes, or is rejected — and where
Notes:     Automatable? yes / no / partly, and why
```

## Rules for expected results

- Verifiable by observation. "Works correctly" and "no errors" are not expected results.
- Name the element and the value: "the counter reads `1 item left` and the new row appears at the bottom of the list".
- One behavior per case. If the expected result needs the word "and" three times, split the case.
- State the correct behavior, not the app's current behavior. If they differ, that is a defect — file it and keep the case as written.

## Coverage — six lenses

Run every feature through all six and say explicitly when a lens produced nothing:

1. **Positive** — intended use, intended way.
2. **Negative** — wrong input, wrong order, wrong state; empty and whitespace-only; cancelled halfway.
3. **Boundary** — 0, 1, many; empty, one character, maximum length, one over. See the `edge-case-design` skill.
4. **Security-flavored** — input dangerous if rendered or stored naively (`<script>`, HTML tags, quotes). On a client-only app the realistic risk is stored cross-site scripting (XSS) — text executed as code when redisplayed.
5. **Accessibility** — see the `accessibility-testing` skill.
6. **Usability** — can a first-timer work out what to do and recover from a mistake?

## Prioritizing

- **P1** — a user cannot complete the core task, data is lost, or the app is unusable for a group of users.
- **P2** — a real user hits it on a normal path, but there is a way through.
- **P3** — cosmetic, rare, or only reachable deliberately.

Priority is how soon to fix; severity is how bad the impact is. They are independent — give both in defects.

## Deliverable

A table or list of cases, grouped by area, worst-risk first, plus one plain-English paragraph: what is covered, what is deliberately out of scope, and which cases should be automated first. Hand automation candidates over with their expected result already written as a checkable statement.
