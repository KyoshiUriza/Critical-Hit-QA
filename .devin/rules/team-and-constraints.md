---
description: "Project constraints for Critical Hit QA, and which subagent or skill to use for each kind of work"
trigger: model_decision
---

Critical Hit QA is a 100% static site that helps aspiring QA engineers practice. Four constraints hold for every change, and none of them get a "just this once" exception — if breaking one is genuinely necessary, surface it as an explicit trade-off, never a silent addition:

1. Static only. No backend, no accounts; per-browser state lives in `localStorage`.
2. Zero npm dependencies, zero CDN scripts, zero external assets. `@playwright/test` is the only devDependency.
3. Every interactive element in a practice app exposes a stable `data-testid`.
4. Themed on *The Convergence Chronicles: The Resonance Lattice*.

Subagents live in `.devin/agents/`. Team roles: `product-owner`, `scrum-master`, `ux-designer`, `ui-designer`, `frontend-developer`, `qa-engineer`, `automation-engineer`, `security-engineer`, `devops-engineer`, `tech-lead`. User panel: `persona-curious`, `persona-new-tester`, `persona-intermediate-tester`, `persona-senior-qa`, `persona-qa-lead` — these are read-only reviewers who report observations, never designs or edits. `persona-senior-qa`'s accuracy findings outrank other personas' preferences, and `tech-lead` arbitrates conflicting recommendations.

Skills in `.agents/skills/` carry the procedures: `writing-test-cases`, `edge-case-design`, `designing-test-suites`, `exploratory-testing`, `writing-bug-reports`, `accessibility-testing`, `playwright-test-authoring`. Use the matching skill rather than improvising.

Two house rules for all QA work: plain English, defining a term of art inline the first time it appears; and assert correct behavior, never current buggy behavior — no `waitForTimeout`, no `force: true`, no retry standing in for a diagnosis.
