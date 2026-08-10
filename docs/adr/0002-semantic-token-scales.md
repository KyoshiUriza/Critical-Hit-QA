# ADR 0002 — Radius, elevation, spacing and type are semantic scales

**Status:** Accepted (2026-08-10)

## Context

A single `--radius: 10px` was applied to everything from a 4px progress fill to
a 480px modal, and only 9 of 59 `border-radius` declarations used it at all. The
same pattern held for shadows (1 token, 9 hardcoded) and font sizes (23 ad-hoc
values, no scale).

## Decision

Five scales, chosen by **what an element is**, not by which literal it replaces:

| Scale | Steps | Chosen by |
|---|---|---|
| `--rad-xs/sm/md/lg/full` | 2 / 4 / 6 / 12 / 999px | element size and role |
| `--shadow-sm/md/lg` | layered, separate light values | elevation intent |
| `--sp-1…12` | 4px grid | — |
| `--fs-xs…5xl` | 10 steps | — |
| `--border` / `--border-strong` / `--border-control` | — | see ADR 0003 |

## Consequences

The migration itself demonstrated the failure mode this ADR exists to prevent:
`.q-item .tag` (a 20px chip) and `.todo-filter` (a pill) were both given
`--rad-lg` — the "cards, panels, modals" step — purely because 12px happened to
be the literal they replaced. Both were caught in review and corrected.

**The rule: pick the step that matches what the element is. Never the step whose
value matches what was there before.**

`--radius` and `--shadow` survive as deprecated aliases. Exit criteria: delete
them once the remaining 9 readers are migrated and the page-level `<style>`
blocks in `practice-apps/` are folded into the stylesheet.

Known incomplete: the scales are ~100% adopted inside `css/styles.css` and 0%
in markup — 52 inline `font-size` and 9 inline `border-radius` remain. Until
those are migrated the system looks authoritative but only half applies, and
nothing in the test suite asserts a computed style. That is the next debt.
