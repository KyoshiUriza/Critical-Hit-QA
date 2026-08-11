# ADR 0004 — Optional cross-device sync: what it would actually take

**Status:** Proposed — assessment only, nothing built
**Date:** 2026-08-11
**Revisits:** [ADR 0002](0002-local-profiles-instead-of-real-accounts.md)

## Context

ADR 0002 chose local profiles and sync codes over real accounts, and closed
with a condition: *"If cross-device sync becomes the thing people actually ask
for, the upgrade path is GitHub OAuth rather than email and password."*

That is now the ask, with one constraint attached: **sign-in must be optional,
not required.** This document is the engineering assessment ADR 0002 deferred.
It builds nothing.

## What is already true

Measured, not assumed.

| Fact | Value |
| --- | --- |
| Pages carrying `connect-src 'none'` | 56 of 56 |
| Enforced by | `tests/security.spec.js`, which lists it as "the single strongest line in this policy" |
| Backend | none — static files on GitHub Pages |
| Secrets in CI | none |
| Storage seam | `Profiles.storageKey()`, added by ADR 0002 for exactly this |
| Incoming-data validator | `js/progress-schema.js`, already rebuilds any blob field by field against a whitelist |

Two pieces of the work are therefore already done: there is a single choke
point for storage access, and untrusted incoming progress is already treated
as attacker-supplied.

### The payload, measured

A fully-worked account, generated and measured in a real browser:

| Contents | Serialized size | As a sync code |
| --- | --- | --- |
| Progress only (all 60 defects, 40 quiz runs, no drafts) | **4.7 KB** | ~6 KB |
| Plus 12 saved drafts | **22 KB** | **29,762 chars** |
| At the 100-artifact storage cap | **151 KB** | ~200 KB |

**This is a finding, not background.** ADR 0002 said a code "above 4,000
characters" is unwieldy and points at the JSON export instead. In practice
that threshold is crossed by the *twelfth saved draft* — 29,762 characters.
The sync code is a viable transport for progress, and effectively dead for the
drafts, which are the most valuable thing in the store.

Any of the options below moves 151 KB worst case. That is trivial for a file
and trivial for a network request. **Size is not the constraint. The
constraint is entirely about liability, dependency and operations.**

## Options

### A — Make the existing manual path good

Keep everything local. Turn the JSON export into a real file download with a
sensible filename, accept a dropped file on import, and surface both on the
Progress page rather than only the Account page.

- **Effort:** ~half a day.
- **Breaks:** nothing. CSP untouched, no PII, still offline, no backend.
- **Gives:** cross-device transfer that already works, made obvious.
- **Does not give:** anything automatic. The user must remember.

### B — GitHub device flow, progress stored in the user's own private Gist

Sign in with GitHub; the progress blob is written to a private Gist **owned by
the user**. There is no user table anywhere, because the data lives in the
account the user already controls and can delete without asking us.

- **Effort:** ~3–5 days including UI, conflict handling and tests, plus about
  half a day for the relay described below.
- **Breaks:** `connect-src 'none'` on the Account page only.
- **PII held by this project:** none. GitHub holds the identity.
- **Fits the audience:** testers and developers overwhelmingly have GitHub.

#### The CORS question, now researched

The ADR originally flagged this as unknown. It has been checked, and the
answer is split:

| Endpoint | Used for | CORS from a browser |
| --- | --- | --- |
| `api.github.com` | reading and writing the Gist | **Yes** — responds `Access-Control-Allow-Origin: *` |
| `github.com/login/oauth/access_token` | exchanging the device code for a token | **No** — no CORS headers, and OPTIONS is not supported |

So the data half of this design works directly from the browser, and only the
token exchange does not. Confirmed separately: **the device flow needs no
client secret** — only a client id.

That combination is better than it first looks. The relay this option needs is
therefore:

- **stateless** — it forwards two calls and remembers nothing;
- **secret-free** — there is no client secret to hold or rotate, so a
  compromise of the relay leaks no credential of ours;
- **storage-free** — no user data passes through it beyond a short-lived
  device code, and none is retained.

Compare that with option D, whose backend must *store every user's blob
forever* and be defended against becoming free file hosting. A stateless relay
that holds nothing is a materially smaller thing to operate than a datastore,
even though both are "a backend".

### C — Third-party BaaS with email accounts (Supabase, Firebase, Auth0)

The conventional answer, and the one ADR 0002 rejected.

- **Effort:** ~5–8 days, plus ongoing operation.
- **Breaks:** `connect-src 'none'`, and the "no signup, no tracking"
  positioning the site advertises.
- **Creates:** an email address in a database — data-controller duties under
  GDPR and CCPA, deletion requests, 72-hour breach notification, a privacy
  policy, and a user table that can be breached.
- **Note the contradiction:** the site's own Test Data track tells learners
  that personal data in a lower environment is a liability and that "being the
  person who asks 'is this masked?' is cheap and remembered." Adding an email
  table to a free study tool is the move that page argues against.

### D — Passphrase sync, end-to-end encrypted, to a dumb blob store

No accounts and no identity at all. The user picks a passphrase; the client
derives a key with WebCrypto, encrypts the blob, and stores it under a hash of
the passphrase on a minimal key-value endpoint (a Cloudflare Worker on the
free tier, say). Any device with the passphrase pulls it back.

- **Effort:** ~4–6 days including the endpoint, plus operating it forever.
- **Breaks:** `connect-src 'none'` on the Account page only.
- **PII:** none, by construction. The server holds ciphertext it cannot read.
- **Costs:** a service to run, rate limiting and size caps to stop it becoming
  free file hosting, and a lost passphrase means lost sync with no reset —
  though local progress survives, so the failure is soft.

## Recommendation

**Do A now regardless of what else is decided.** It is half a day, it breaks
nothing, and it makes the capability the site already has actually findable.
Whatever happens next, the manual path stays as the offline fallback.

**Then pursue B.** The CORS question has been researched and the answer does
not disqualify it. B costs one stateless, secret-free relay for a single call;
every byte of user data still goes directly from the browser to a Gist the
user owns and can delete without asking us.

The ADR's first draft said that needing a proxy would make D "the more honest
choice". Having checked what each backend actually has to do, that was wrong:
D's backend must hold every user's data indefinitely and be defended against
abuse, while B's holds nothing at all. **Stateless and storage-free beats
stateful, even when both technically require a service.**

**C is not recommended.** It is the most work, the most liability, and it
contradicts material the site publishes.

## What would have to change, whichever remote option is chosen

- `tests/security.spec.js` — `connect-src 'none'` becomes a per-page rule with
  one documented exception, exactly as `frame-src` already is. That test's own
  comment says a loosening "should be a deliberate decision with a test
  change, not something that happens quietly" — this ADR is that decision.
- A new invariant, and a test for it: **the site must work fully with sync
  switched off.** Every page except Account keeps `connect-src 'none'`, and no
  feature may require a signed-in state.
- Conflict handling. Two devices editing drafts is a real merge problem, not a
  last-write-wins one. Cheapest defensible rule: sync is per-profile, the
  newest `updatedAt` wins per artifact, and the loser is kept rather than
  discarded.
- A privacy statement, even for option B or D, saying exactly what leaves the
  browser and when.

## Consequences of doing nothing

Perfectly livable. Progress survives on each device, the sync code covers
progress-without-drafts today, and the JSON export covers everything. The
honest framing is that this is a **backup and transfer** story rather than a
sync story — and for a study tool used by one person on two machines, that may
be all it ever needs to be.
