---
name: designing-test-suites
description: Structure a set of tests into a maintainable suite — file layout, naming, fixtures, test levels, smoke/regression tiers, and CI wiring. Use when starting a suite, reorganizing one that has grown messy, or deciding what belongs at which test level.
---

# Designing a test suite

A suite is not a pile of tests. It is a structure someone else can extend without reading all of it.

## Decide the level first

Push each check to the cheapest layer that can prove it:

| Layer | Proves | Cost |
|---|---|---|
| Unit | Pure logic — validation, formatting, sorting | Milliseconds |
| API / request | Server contracts, status codes, persistence | Fast, no browser |
| End-to-end (UI) | The user's real path through the screen | Slow, most fragile |

Only test through the UI what genuinely requires the UI. A rule that "empty input is rejected" belongs in a unit test if that logic is reachable; the end-to-end suite proves that the user sees the rejection.

## File layout

- One spec file per feature area, named after the area (`bounty-panel.spec.js`), not per test.
- Shared setup in fixtures (`test.extend`) or typed helpers, never copy-pasted across files.
- Page Objects — a class holding a screen's locators as fields and its user actions as methods — once a flow is reused about three times or a single test exceeds ~30 lines. Not before.
- Test data as typed constants or builder functions in one place, so an edge-case string is defined once and reused.

## Naming

- Test titles read as sentences about the app: `'deletes a completed todo from the list'`. Never `'test 3'`.
- Group phases with `test.step(...)` so the HTML report reads like a script a human can follow.
- The title plus the report should say what broke without anyone opening the code.

## Tiers

- **Smoke** — the handful of tests that prove the app is fundamentally alive. Runs on every push, finishes in a minute or two. Tag them (`@smoke`) and run with `--grep @smoke`.
- **Regression** — the full suite. Runs on pull requests and nightly.
- **Deep / exploratory follow-ups** — cases derived from real defects, added permanently once fixed.

Every fixed defect earns one regression test asserting the correct behavior.

## Isolation and parallelism

- Every test starts from a known state and is safe to run alongside any other. `fullyParallel: true` is the target.
- No shared mutable module state, no ordering dependencies, no test that cleans up after another.
- Prefer fresh browser contexts (Playwright's default) over manual cleanup.

## CI

- Install browsers, run the suite, upload the HTML report and traces as artifacts on failure.
- Enable `forbidOnly` on CI so a stray `test.only` fails the build instead of silently skipping the suite.
- Retries on CI only, and treat every retry-passing test as flake to investigate — not as a pass.
- Keep the end-to-end wall time under about ten minutes; shard across workers if it grows past that.

## Deliverable

The layout (files and what each covers), the tier tagging, what moved to a cheaper level and why, and the actual run output proving the reorganized suite still passes.
