# ADR 0003 — The Tester's Lattice becomes a character sheet

**Status:** Accepted
**Date:** 2026-08-10
**Refines:** [ADR 0001](0001-keep-the-lattice-vocabulary.md)

## Context

ADR 0001 decided the Lattice vocabulary stays — Star-Dust, Ranks, the Lattice
itself — because gamifying QA learning is the site's stated goal.

What that decision did not distinguish was **vocabulary** from **plot**. The
Lattice page had drifted into the second: achievement text quoted book events
("Remii kept everyone functional at cost of her own reserves", "Kestrel's
counter can't track it"), rank blurbs referenced factions ("D.A.C. has a
designation"), and a "Bound Catalysts" panel listed artifacts from the novel
with abilities like "Creature Affinity" that connect to nothing a learner does.

For a reader of the book, this is flavor. For the site's actual audience —
someone preparing for QA interviews — it is unexplained noise on a page that
claimed to be "your character sheet" while containing no information about
them beyond one number.

The direction: rework it into an actual character sheet — the user's skills
and growth, visible in one place.

## Decision

**Vocabulary stays. Plot goes. Every element must earn its place by saying
something true about the user.**

1. **Skills, computed from evidence.** The sheet's core is eleven skills —
   seven knowledge skills (one per quiz category) and four craft skills
   (defect hunting, test design, bug reporting, consistency) — each tiered
   Untrained → Expert from data the Progress store already holds. Nothing is
   self-assessed. Knowledge tiers require volume AND accuracy together, so
   three lucky answers move nothing.

2. **Ranks stay, grounded.** Names and thresholds are untouched (the header
   chip depends on them; they are the persistent identity of the gamification
   layer). Every blurb is rewritten to describe the point in a real QA journey
   the rank corresponds to — the ladder now doubles as a skills roadmap.

3. **Achievements stay, re-described.** Ids are stable (they persist in
   `qaprep_rpg_seen`; changing one re-toasts it for everyone who has it).
   Names keep their light flavor. Every description now states the QA skill
   the milestone evidences, and a test enforces that no book-plot reference
   returns.

4. **Catalysts are removed.** They were the one element with no user-data
   referent at all — a list of items from the novel. Nothing else consumed
   `CATALYSTS` or `unlockedCatalysts`, so the API is gone too. Their unlock
   conditions were near-duplicates of achievement conditions; nothing of
   substance is lost.

5. **A growth log.** Recent quiz runs and drafted artifacts, interleaved,
   newest first, capped at eight. A pulse, not an audit trail.

6. **The profile is the character.** The sheet is headed by the active
   profile's name (built with `textContent` — the name is user input), which
   ties the profiles feature (ADR 0002) to the gamification layer: switching
   profiles switches character sheets.

## Consequences

- The page now answers "what am I good at and what should I work on next" —
  which is the question a learner actually has. Weak skill bars point at
  specific quiz categories; the rank blurbs say what the next stage looks like.
- The header chip, toasts, Star-Dust math and rank thresholds are unchanged.
  No stored data migrates; nobody loses progress or unlocked achievements.
- The book connection survives where it works — naming, tone, the footer
  credit linking to the serial — and stops where it cost comprehension.
- Guardrail from ADR 0001 still holds and is still tested: exported artifacts
  (portfolio documents) carry no in-universe vocabulary at all.
- `tests/lattice.spec.js` pins the new behavior, including a regression test
  that fails if book-plot references (character or faction names) reappear in
  milestone text.
