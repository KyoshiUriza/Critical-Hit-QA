# Hosting the QA Prep Hub

The site is 100% static — no build step, no server, no database. That means it deploys anywhere for free.

Three easy paths, ranked by "least effort first":

---

## Option 1 — Netlify Drop (zero setup, ~60 seconds)

Best if you just want a URL right now.

1. Go to **https://app.netlify.com/drop**
2. Drag the entire `QA Website Project` folder into the browser window.
3. Netlify uploads it and gives you a URL like `https://serene-otter-abc123.netlify.app`.
4. Sign up (free) if you want to keep the URL or add a custom domain.

To update it later, drag the folder again — same URL, replaces the site.

**Pros:** literally 60 seconds, no CLI, no git needed.
**Cons:** manual re-upload for every change.

---

## Option 2 — Netlify with git-based deploys (~5 minutes)

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

## Option 3 — GitHub Pages (free, GitHub-native)

Best if you want your site under `https://YOUR-USERNAME.github.io/qa-prep-hub/`.

Prereqs: a free GitHub account.

```bash
# From the project folder
git init
git add -A
git commit -m "Initial commit"
git branch -M main
# Create the empty repo on github.com first
git remote add origin https://github.com/YOUR-USERNAME/qa-prep-hub.git
git push -u origin main
```

Then on GitHub:
1. Go to your repo → **Settings → Pages**
2. Under **Build and deployment → Source**, pick **GitHub Actions**
3. The included `.github/workflows/deploy-pages.yml` runs automatically on push and publishes the site.
4. First deploy takes ~1–2 minutes. Then visit `https://YOUR-USERNAME.github.io/qa-prep-hub/`.

**Note:** because GitHub Pages serves under a subpath, all links in this project use relative paths (`../pages/foo.html`, `pages/foo.html`) — they work correctly.

---

## Option 4 — Cloudflare Pages / Vercel (also free)

Same shape as Netlify:
- **Cloudflare Pages** → https://pages.cloudflare.com/ — connect GitHub, framework preset "None", build output directory `.`
- **Vercel** → https://vercel.com/ — connect GitHub, framework preset "Other", output directory `.`

Both give you a free custom subdomain plus HTTPS.

---

## After deploying — sanity check

Open the deployed URL and run through:

1. Home page → all 10 feature cards visible.
2. Practice Tests → start a quiz → answer a question → results screen.
3. Practice Apps → open Login (clean) → sign in with `demo@qa.test` / `Passw0rd!`.
4. Bug Bounty → tick a defect → progress bar advances.
5. Progress → your finds and quiz runs appear.
6. Study Plan → check a day → completion % increases.
7. Open DevTools → Application → Local Storage → confirm `qaprep_progress_v1` key is being written.

If any page 404s, check that the file paths on disk match what the HTML links to (case-sensitive on Linux hosts, case-insensitive on Netlify Drop / GitHub Pages by default — but assume case matters).

---

## Custom domain (optional)

All three of Netlify, Cloudflare Pages, and GitHub Pages let you point a custom domain (like `qaprep.yoursite.com`) at your deployment for free:

- Netlify: Site settings → Domain management → Add custom domain
- Cloudflare Pages: Custom domains tab → Set up a custom domain
- GitHub Pages: Settings → Pages → Custom domain

You add a CNAME record at your DNS provider pointing to the platform. HTTPS is auto-provisioned via Let's Encrypt.
