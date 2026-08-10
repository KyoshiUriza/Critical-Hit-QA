# ADR 0003 — Split `--border` by function

**Status:** Accepted (2026-08-10)

## Context

One `--border` token served two incompatible jobs: separating surfaces, and
identifying form controls. Those have different requirements. A decorative rule
between sections can be faint; a control's border is the only thing that says
"this is a text input", which WCAG 1.4.11 requires to reach 3:1.

The single token measured ~1.3:1 in both themes, so controls failed. Separately,
light-mode cards were invisible: `#ffffff` on `#f7f9fc` is 1.05:1, and the
decorative border was not strong enough to compensate.

## Decision

Three tokens, each answering a different question:

| Token | Job | Requirement |
|---|---|---|
| `--border` | decorative rules, dividers, table lines | none — aesthetic |
| `--border-strong` | card and panel edges, so surfaces read as surfaces | perceptible against both `--bg` and `--bg-elev` |
| `--border-control` | form control boundaries | **3:1 — WCAG 1.4.11** |

Measured for `--border-control`: dark 3.42:1 on fill / 3.07:1 on surface; light
3.33:1 / 3.51:1.

## Consequences

`tests/contrast.spec.js` enforces the 1.4.11 requirement, because the text
walker cannot see a border.

The initial implementation applied `--border-control` to `.form-field` only,
leaving four other input groups on the decorative token — the accessibility
claim was true for one selector and false everywhere else. Corrected in review.
**Any new text control must use `--border-control`.**
