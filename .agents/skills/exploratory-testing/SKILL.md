---
name: exploratory-testing
description: Run timeboxed, charter-based exploratory testing sessions and report the findings. Use when asked to explore a feature, hunt for unknown problems, or test something that has no written test cases yet.
---

# Exploratory testing

Exploratory testing is simultaneous learning, test design, and execution: you decide the next test based on what the last one told you. It is unscripted, not unstructured — the structure is the charter and the notes.

## Charter

Write the charter before touching the app. One sentence, plus a timebox:

> **Charter:** Explore *editing an existing item* with *keyboard only*, to discover *whether a user who cannot use a mouse can complete or abandon an edit*. **Timebox:** 30 minutes.

Template: Explore **\<area\>** with **\<resources / constraints\>** to discover **\<risk or information you want\>**.

Good charters are narrow enough to finish in 30–90 minutes and aimed at a risk, not at a feature list. "Explore the whole app" is not a charter.

## Running the session

- Keep a running log as you go: what you did, what you saw, what surprised you, questions raised. Timestamp roughly.
- Follow surprises. A surprise is the highest-value signal available and the reason this is not scripted.
- Vary one thing at a time when something looks wrong, so you can name the trigger.
- Timebox honestly. When time is up, stop and write up; open a follow-up charter for the thread you were pulling.
- Note the environment (browser, version, OS, URL, date) at the start — every defect you file needs it.

## Useful tours

Pick one or two per session rather than wandering:

- **Feature tour** — every visible control, once, doing the obvious thing.
- **Interruption tour** — refresh, back button, second tab, close mid-action, lose focus.
- **Data tour** — the edge-case catalog (see the `edge-case-design` skill) poured into every input.
- **Configuration tour** — narrow window, mobile viewport, zoom to 200%, dark mode, slow network.
- **Anti-authority tour** — do everything in the wrong order, on purpose.
- **Landmark tour** — a real user's end-to-end goal, start to finish, without shortcuts.

## Reporting

Structure the write-up as:

1. **Charter** and actual time spent.
2. **What I covered** — areas and variations actually touched.
3. **Findings** — defects, worst first, each written up with the `writing-bug-reports` skill's format.
4. **Observations and questions** — behaviors that are odd but may be intended; label these separately from defects, and say which is which.
5. **What I did not cover, and why** — an untested area you name is manageable; one you leave silent is not.
6. **Follow-up charters** — the threads worth another session.

Never report a finding you have not reproduced yourself, and never state a frequency you did not observe.
