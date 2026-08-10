# ADR 0002 — Local profiles and sync codes instead of real accounts

**Status:** Accepted
**Date:** 2026-08-10

## Context

The ask was a sign-up flow so users can "make an account to keep track of their
progress."

Progress tracking already existed, but it was one anonymous blob per browser.
Two people sharing a machine overwrote each other, and moving to a different
device meant starting over.

The constraint that shapes everything: the site is static files on GitHub
Pages. There is no server. Real accounts require a third party — Supabase,
Firebase, Auth0 — which brings consequences a free study tool absorbs badly:

- **Legal duty.** Storing an email address makes this a data controller under
  GDPR and CCPA. Subject access requests, deletion requests, breach
  notification within 72 hours.
- **Liability.** A breach of a hobby project's user table is still a breach.
- **Dependency.** The site currently has zero runtime dependencies and works
  offline. `connect-src 'none'` would have to open up.
- **Contradiction.** The site's own positioning is "no signup, no paywall, no
  tracking". Adding a signup wall to a page that advertises not having one is
  a poor trade for a feature most visitors will skip.

There is also a specific reason not to fake it. On a static site, a login form
can only compare a password held in client-side storage, where any script can
read it. Shipping that on a site that teaches software testing — and which has
a practice app whose seeded defect is *storing credentials in localStorage* —
would be teaching the exact thing it marks as a bug.

## Decision

Local profiles with explicit sync codes.

- Multiple named profiles per browser, each with isolated progress.
- No passwords, no email, no PII, nothing transmitted.
- A sync code — one base64url line containing the whole profile — moves
  progress between browsers and devices when the user chooses to.

Storage layout keeps the original key for the first profile
(`qaprep_progress_v1`) and suffixes the rest (`qaprep_progress_v1:<id>`), so
existing visitors keep their progress with no migration step that could lose
it.

`js/progress.js` resolves its key per call rather than capturing it once, so
switching profiles takes effect without a reload.

## Consequences

**Good**

- Ships without a backend, an account system, or a privacy policy.
- Nothing to breach: there is no user table.
- Still works offline; CSP stays at `connect-src 'none'`.
- The sync code is a better backup story than most real accounts give you — it
  is portable, inspectable, and the user holds it.

**Bad, and accepted**

- **No automatic sync.** Moving devices is a deliberate act. This is stated
  plainly on the Account page rather than buried.
- **Clearing site data loses everything** unless a code was saved. Also stated.
- **A long code is unwieldy.** A profile with many drafts produces a code too
  long to paste comfortably; above 4,000 characters the UI says so and points
  at the JSON export instead.
- Anyone with a code can load that progress. There is nothing sensitive in it
  beyond what the user typed into their own drafts, and this is stated.

**Security note**

A sync code is attacker-suppliable input — it is a string someone can hand you.
It is therefore rebuilt field by field against a whitelist
(`js/progress-schema.js`) rather than parsed and trusted. The same validator
now serves the JSON file import, which previously had its own copy; two
validators for one data shape is one validator and one liability.

Writing that validator surfaced a live bug: the old import silently dropped
`artifacts`, so importing a backup deleted every saved draft — the most
valuable thing in the store.

## Revisiting

If cross-device sync becomes the thing people actually ask for, the upgrade
path is GitHub OAuth rather than email and password: the audience is testers
and developers who mostly have GitHub accounts, and it means never holding a
password. `Profiles` already isolates storage access behind `storageKey()`, so
a remote backend can be added under it without redoing the UI.
