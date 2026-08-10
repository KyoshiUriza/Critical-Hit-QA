# ADR 0001 — Keep the Tester's Lattice vocabulary

**Status:** Accepted (2026-08-10)
**Decision by:** Product owner (project owner)

## Context

The RPG progression layer uses in-universe nouns from *The Convergence
Chronicles: The Resonance Lattice* — Star-Dust for XP, Catalysts for milestone
unlocks, Signature Abilities for achievements, and rank names like "Ghost of the
Lattice".

During the Sprint 4 review the product-owner role argued for retiring these from
user-facing copy, on the grounds that candidates send this link to hiring
managers and fantasy vocabulary reads as unserious. The counter-argument was
that the streak and XP mechanic is the only retention hook the site has.

The decision blocked Theme 1: the artifact exporter writes a portfolio document,
and that document carries whichever vocabulary we choose. Changing it later is a
migration, not a rename.

## Decision

**Keep the Lattice vocabulary.** Gamified learning is the product's purpose, not
a decoration on top of it. A progression system with generic nouns ("Points",
"Milestones") is a weaker version of the same feature — it carries the same
maintenance cost and none of the identity.

## Consequences

**Easier**
- The RPG layer stays coherent: ranks, Catalysts, and Signature Abilities all
  draw on one source, so new unlocks have an obvious naming convention.
- Theme 1 is unblocked; the exporter can use the vocabulary without a pending
  rename hanging over it.

**Harder**
- Every new defect, quiz category, or practice app needs its RPG scoring wired
  in, and ideally an in-universe name. That cost is now accepted, not deferred.
- The professional-credibility risk the PO raised is real but unmeasured. It is
  mitigated, not eliminated, by the Sprint 2 decision to demote the Lattice to
  an opt-in teaser on the home page rather than a headline feature.

**Guardrails that stay in force**
- The Lattice remains cosmetic. Nothing gated behind it, no core flow requires
  understanding it — the home page still says "ignore it and nothing changes".
- Exported portfolio artifacts (bug reports, test cases) must NOT carry
  in-universe vocabulary. Those documents are shown to employers. The lore lives
  in the study experience, not in the candidate's output.

## Alternatives considered

- **Retire the nouns, keep the engine.** Rejected: strips identity while keeping
  every maintenance cost.
- **Lore as a theme toggle.** Rejected for now as unnecessary complexity —
  revisit only if real user feedback surfaces the credibility concern.
