# Security

**Live site:** https://kyoshiuriza.github.io/Critical-Hit-QA/

## Reporting a vulnerability

Open a [private security advisory](https://github.com/KyoshiUriza/Critical-Hit-QA/security/advisories/new).
That keeps the report confidential until it is fixed. If you cannot use
advisories, open a normal issue but describe the class of problem without a
working exploit, and say you have details to share privately.

Please do include: the URL, the browser, what you did, and what happened.

Expect a first response within a week. This is a solo side project, not a
product with an on-call rota — that is a realistic commitment rather than a
flattering one.

### Out of scope, deliberately

**The practice apps contain intentional vulnerabilities.** Finding them is the
entire point of the site. Before reporting anything under `practice-apps/`,
check [`js/data/defects.js`](js/data/defects.js) — every seeded defect is
catalogued there with an id and a severity.

Anything in a file whose name ends `-broken.html` is intentional by definition.

## What the threat model actually is

This site is static files on GitHub Pages. There is no server, no database, no
user accounts, no cookies, no analytics, and no third-party scripts. It makes
no network requests at all — there is no `fetch`, `XMLHttpRequest`, `WebSocket`
or `sendBeacon` anywhere in it, and a test enforces that.

That removes most of the usual categories outright. What is left:

| Risk | Status |
|---|---|
| Stored/reflected XSS | No server, so no stored XSS. User text is written with `textContent`, never `innerHTML`. |
| Data exfiltration after an injection | `connect-src 'none'` — injected script has nowhere to send anything. |
| Malicious sync code | Every imported blob is rebuilt field by field against a whitelist in [`js/progress-schema.js`](js/progress-schema.js). Unknown keys are dropped, not merely unvalidated. |
| Supply chain | No runtime dependencies at all. Playwright is dev-only and never ships. |
| Repository compromise | The realistic worst case. See the checklist below. |
| Clickjacking | **Not mitigated.** See "Known gaps". |

## Content Security Policy

Every page ships this in a `<meta http-equiv>` tag:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'none';
object-src 'none';
frame-src 'none';
base-uri 'self';
form-action 'self'
```

`tests/security.spec.js` fails if a page ships without it or if one of the
restrictive directives is loosened.

Two of these carry most of the weight:

- **`connect-src 'none'`** — the site genuinely makes no requests, so this
  costs nothing and means injected script cannot phone home.
- **`base-uri 'self'`** — stops an injected `<base>` from re-pointing every
  relative URL on the page, which would otherwise defeat `'self'` entirely.

### Known gaps, stated plainly

- **`'unsafe-inline'` is present for scripts.** 19 pages carry inline
  `<script>` blocks and there are 9 inline event handlers. Removing it means
  extracting all of those to files first. Until then, an injected inline script
  would execute — though `connect-src 'none'` means it cannot send anything
  anywhere.
- **No `frame-ancestors`, so no clickjacking protection.** That directive is
  ignored in `<meta>` CSP; it only works as an HTTP header, and GitHub Pages
  does not let you set headers. Same for `X-Content-Type-Options` and
  `Permissions-Policy`. Moving to Cloudflare Pages or Netlify would allow all
  of them. For a site with no authenticated actions, the clickjacking risk is
  close to nil, which is why this has not forced a move.

## Repository hardening

GitHub settings cannot be set from a file in the repo. These need doing in the
web UI, and are ordered by how much they matter here.

- [ ] **Two-factor authentication on the account.** A repo compromise means an
      attacker edits `deploy-pages.yml` and publishes whatever they like to a
      site people are being told to trust. This is the single highest-value
      item on the list.
      *Settings → Password and authentication (account, not repo).*
- [ ] **Protect `main`.** Currently `"protected": false`. Require a pull
      request, and block force pushes and deletion.
      *Settings → Branches → Add branch ruleset.*
- [ ] **Restrict workflow permissions to read-only by default.** The deploy
      workflow already requests exactly what it needs in its own
      `permissions:` block, so tightening the default costs nothing.
      *Settings → Actions → General → Workflow permissions.*
- [ ] **Require approval for workflows from outside collaborators.**
      *Settings → Actions → General → Fork pull request workflows.*
- [ ] **Turn on secret scanning and push protection.** Free on public repos,
      and it blocks a credential from being committed rather than reporting it
      afterwards.
      *Settings → Advanced Security.*
- [ ] **Turn on Dependabot alerts.** Only dev dependencies exist, but a
      compromised dev dependency can still reach the machine that publishes.
      *Settings → Advanced Security.*

Nothing in this repo should ever hold a secret. The deploy workflow uses only
the automatically-provided `GITHUB_TOKEN`, and the site has no API keys because
it makes no API calls.

## Privacy

All state is `localStorage` on the visitor's own machine under keys beginning
`qaprep_`. Nothing is transmitted. There is no account to breach because there
is no account — see [`docs/adr/`](docs/adr/) for why that was chosen over a
real backend.
