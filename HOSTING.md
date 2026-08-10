# Hosting the Critical Hit QA

The site is 100% static — no build step, no server, no database.

**Live at:** https://kyoshiuriza.github.io/critical-hit-qa/
**Repo:** https://github.com/KyoshiUriza/critical-hit-qa

---

## GitHub Pages (the setup in use)

Deployment is automated by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
Every push to `main` rebuilds and publishes.

### One-time setup

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
   (Not "Deploy from a branch" — the workflow handles it.)
3. Push to `main`, or run the workflow manually from the **Actions** tab.

The first run takes 1–2 minutes. Watch it in **Actions → Deploy to GitHub Pages**.

### What actually gets published

The workflow does **not** publish the repository. It assembles a `_site/`
directory containing only `index.html`, `css/`, `js/`, `pages/` and
`practice-apps/` — 55 files. Tests, ADRs, the design-audit script, the
proposals and `package.json` stay in the repo and off the web.

It also runs two checks before uploading, so a broken deploy fails loudly
rather than going live:

- every critical file is present
- no root-relative paths (`href="/js/..."`) exist

That second one matters more than it looks. GitHub Pages serves a project site
from a **subpath** — `/critical-hit-qa/`, not `/`. Any root-relative path silently 404s
in production while working perfectly on `localhost`. Every path in this
project is relative, and `js/site-chrome.js` derives its own prefix from each
page's `data-depth`, so the whole site is subpath-safe. The check keeps it that
way.

`.nojekyll` is written into the build so Pages serves files verbatim instead
of running them through Jekyll.

### Verifying a deploy

```bash
node verify-deploy.js
```

Drives the live site in a real browser and checks the things that can only
break in production:

- all 11 key pages return 200, render the injected chrome, load CSS, and
  produce zero console errors and zero failed requests
- no nav link escapes the `/critical-hit-qa/` subpath
- repo internals (`tests/`, `package.json`, `README.md`) are **not** served —
  catching a regression in the workflow's assemble step
- the quiz, Locator Lab, and SQL Sandbox actually execute
- a draft autosaves and appears in the portfolio
- the footer points feedback at Issues rather than a mailto

Exits non-zero on any problem, so it can gate a release.

Pointing it at the local dev server will fail the "repo internals" block, and
that is correct — `python -m http.server` serves the whole working directory
while the deploy serves only the assembled `_site/`.

### If the first run fails

| Symptom | Cause |
|---|---|
| `Get Pages site failed` | Source isn't set to **GitHub Actions** yet — step 2 above |
| 404 at the site URL | Deploy succeeded but Pages is still propagating; wait a minute |
| CSS missing, HTML renders bare | A root-relative path slipped in — the workflow's check should have caught it |
| Actions tab shows nothing | Workflows are disabled for the repo, or the push didn't reach `main` |

---

## Other hosts

The site is portable — nothing about it is GitHub-specific.

### Netlify Drop (zero setup, ~60 seconds)

Best if you just want a URL right now.

1. Go to **https://app.netlify.com/drop**
2. Drag the entire `QA Website Project` folder into the browser window.
3. Netlify uploads it and gives you a URL like `https://serene-otter-abc123.netlify.app`.
4. Sign up (free) if you want to keep the URL or add a custom domain.

To update it later, drag the folder again — same URL, replaces the site.

**Pros:** literally 60 seconds, no CLI, no git needed.
**Cons:** manual re-upload for every change.

---

### Netlify with git-based deploys

Best if you want automatic redeploys whenever you edit a file locally and push.

Prereqs: a free GitHub account.

```bash
# From the project folder
git init
git add -A
git commit -m "Initial commit"

# Create a new empty repo on github.com first (call it qa-prep-hub or similar)
git remote add origin https://github.com/YOUR-USERNAME/qa-prep-hub.git
git branch -M main
git push -u origin main
```

Then in Netlify:
1. https://app.netlify.com → **Add new site** → **Import an existing project**
2. Choose GitHub, authorize, pick your `qa-prep-hub` repo
3. Build settings: leave everything blank (publish directory is `.`, no build command)
4. Deploy — done. Every `git push` now redeploys automatically.

The included `netlify.toml` at the root configures the publish directory and adds sensible security headers.

---

### Cloudflare Pages / Vercel

Same shape as Netlify:
- **Cloudflare Pages** → https://pages.cloudflare.com/ — connect GitHub, framework preset "None", build output directory `.`
- **Vercel** → https://vercel.com/ — connect GitHub, framework preset "Other", output directory `.`

Both give you a free custom subdomain plus HTTPS.

---

## After deploying — sanity check

Open the deployed URL and run through:

1. Home page → hero, the three grouped card sections, and the stats strip render.
2. Practice Tests → start a quiz → answer a question → results screen.
3. Practice Apps → open Login (clean) → sign in with `demo@qa.test` / `Passw0rd!`.
4. Bug Bounty → tick a defect → progress bar advances.
5. Progress → your finds and quiz runs appear.
6. Study Plan → check a day → completion % increases.
7. Bug Report Builder → type a title, wait a second, reload → the draft is still there.
8. Portfolio → Export all as Markdown → a document appears.
9. Open DevTools → Application → Local Storage → confirm `qaprep_progress_v1` is written.

If any page 404s, check that the file paths on disk match what the HTML links to (case-sensitive on Linux hosts, case-insensitive on Netlify Drop / GitHub Pages by default — but assume case matters).

---

## Custom domain (optional)

All three of Netlify, Cloudflare Pages, and GitHub Pages let you point a custom domain (like `qaprep.yoursite.com`) at your deployment for free:

- Netlify: Site settings → Domain management → Add custom domain
- Cloudflare Pages: Custom domains tab → Set up a custom domain
- GitHub Pages: Settings → Pages → Custom domain

You add a CNAME record at your DNS provider pointing to the platform. HTTPS is auto-provisioned via Let's Encrypt.
