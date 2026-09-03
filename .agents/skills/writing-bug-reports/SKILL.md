---
name: writing-bug-reports
description: Write defect reports a stranger can reproduce, with severity and priority, evidence, and impact. Use when a problem is found and needs filing, or when triaging or sharpening existing bug reports.
---

# Writing bug reports

A bug report is a reproduction recipe plus an argument for why it matters. If the reader has to ask you a question, it is not finished.

## Format

```
Title:       <what breaks> when <condition>
Severity:    Critical | High | Medium | Low     — how bad the impact is
Priority:    P1 | P2 | P3                       — how soon it should be fixed
Environment: Browser + version, OS, URL, date
Steps:       1. ...  2. ...   numbered, from a clean state
Expected:    What should happen, and the basis for that (spec, convention, or WCAG criterion)
Actual:      What happened, quoted or described exactly
Evidence:    Screenshot, console output, recording, trace path
Frequency:   Always | intermittent (state the rate you observed, e.g. 3 of 10)
Impact:      Who is affected and what it costs them, in one plain sentence
```

## Rules

- **Title readable in a list.** "Zero-width space creates an invisible todo that still counts toward 'items left'" — not "input bug".
- **Steps start from a clean state** and contain no interpretation. Someone who has never seen the app follows them and lands on the failure.
- **One defect per report.** Two problems found in one flow are two reports, cross-referenced.
- **Expected needs a basis.** Say why you believe it should behave that way: a spec line, an established convention, or a WCAG 2.2 criterion by number (e.g. 2.4.7 Focus Visible).
- **Actual is observed, never inferred.** Quote the exact text on screen and the exact console error.
- **Severity and priority are different, and you always give both.** A typo on the landing page can be Low severity and P1 priority. Justify anything you mark Critical or P1 in one line.
- **Never file something you have not reproduced yourself.** If you saw it once and cannot reproduce, say exactly that and give the rate you observed.
- **Distinguish a defect from a design weakness.** "No visible focus ring" is a defect against WCAG; "the filters would be easier to find at the top" is a design opinion — label it as one.

## Severity guide

- **Critical** — data loss, security exposure, or the core task cannot be completed at all.
- **High** — a main flow is broken or unusable for a group of users, with no reasonable workaround.
- **Medium** — a real user hits it on a normal path but can work around it.
- **Low** — cosmetic, rare, or only reachable deliberately.

## Before filing

Check the existing notes, known-issues file, and open reports. If it is already known, extend or sharpen that entry — a clearer repro, a newly found trigger, a wider impact — instead of filing a duplicate.

## After filing

Anything worth preventing from returning gets a regression test: hand it to automation with the expected result already written as a checkable statement.
