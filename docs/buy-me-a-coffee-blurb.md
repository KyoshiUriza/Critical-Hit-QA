# Buy Me a Coffee — creator profile copy

Buy Me a Coffee asks for a few different fields of different lengths. Options
for each are below — pick one per field, or mix.

**Handle:** the site already links to `buymeacoffee.com/kyoshiuriza`, so claim
**`kyoshiuriza`** if it's free. If it isn't, grab something else and update
`DONATE_URL` in `js/site-chrome.js` — it's one line and every page picks it up.

---

## 1. Tagline / "What are you creating?" (one line)

Pick one:

> Free, open-source practice tools for people trying to break into software QA.

> I build free QA interview-prep tools — broken apps to hunt bugs in, and the
> tools to write them up.

> Free, no-signup practice apps for aspiring QA engineers. No paywall, ever.

---

## 2. Short bio (~2–3 sentences — the About box)

> I build **QA Prep Hub**, a free set of practice tools for people trying to
> land their first software QA role. It has deliberately broken web apps to
> hunt bugs in, a lab that grades your test locators and tells you which ones
> will break in six months, and an in-browser SQL sandbox — plus quizzes,
> interview questions, and runnable Playwright examples.
>
> No signup, no paywall, works offline. Coffee keeps the content growing.

---

## 3. Longer version (the main profile page)

> ### QA Prep Hub — free practice tools for aspiring QA engineers
>
> Most QA interview prep hands you flashcards. That teaches you to recite what
> regression testing *is*, which is exactly the answer hiring managers say they
> are tired of hearing.
>
> So I built the other thing. **QA Prep Hub** gives you deliberately broken web
> applications with real, catalogued defects seeded into them. You run an
> exploratory session, find what you can, and score yourself against the answer
> key — weighted by severity, so a critical find counts for more than a
> cosmetic one. Then you write the bug report, and export it as a document you
> can actually show an interviewer.
>
> **What's in it, all free:**
>
> - **14 practice applications** — 10 clean, 4 seeded with 31 real defects
>   across validation, calculation, security, and state
> - **Locator Lab** — type a CSS selector or XPath and it grades it live: does
>   it match, does it match the *right* element, and will it survive the next
>   deploy? It catches generated class names, positional selectors, and text
>   that changes with state
> - **SQL Sandbox** — a real query engine running in your browser against a
>   dataset with an orphaned row and a NULL-versus-empty-string trap hidden in
>   it. No install, no server
> - **Bug Report and Test Case builders** that autosave and export to Markdown,
>   GitHub Issues, or Jira
> - Quizzes, interview questions with model answers, learning tracks for manual
>   and automation testing, and runnable Playwright, Cypress, and Selenium
>   examples
>
> No account. No paywall. No tracking. It works offline once loaded, and the
> whole thing is open source.
>
> I'm a QA engineer, and I built the resource I wanted when I was starting out.
> If it helps you land something, a coffee means I get to keep adding to it.

---

## 4. Support-tier / "thank you" note (shown after someone donates)

> Thank you — genuinely. This project has no ads, no paywall and no investor,
> so coffee is the entire budget. It goes into new practice apps, more seeded
> defects to hunt, and keeping the interview content current.

---

## 5. A few thank-you one-liners (BMC shows these on the widget)

> Every coffee buys another practice app.

> Fuel for finding more bugs.

> Keeps it free for the next person job-hunting.

---

## Website field

BMC has a website/link field. Once the site is live, use:

    https://kyoshiuriza.github.io/QAHub/

Add the repo as a second link if BMC allows it — `https://github.com/KyoshiUriza/QAHub`.
An open-source project with a test suite reads more credibly than a bare site,
and it is the thing that separates this from a landing page.

The site's own footer already links back to BMC, so once both exist the loop is
closed in both directions.

## Notes on the copy

- **It stays concrete.** Everything above is checkable against the live site —
  14 apps, 31 seeded defects, real SQL engine, offline. Nothing is inflated,
  which matters given the audience is professional testers who will verify.
- **The pitch is the differentiator, not the feature list.** The opening
  contrast — flashcards teach recitation, this teaches finding — is the thing
  competitors don't have, and it's what the site's own home page leads with.
- **No in-universe vocabulary.** Per ADR 0001, the Lattice's Star-Dust and
  Catalysts stay inside the study experience. This page is public-facing and
  aimed partly at people who may also be evaluating you professionally.
- **Add the live URL once deployed.** BMC has a website field; put the GitHub
  Pages or Netlify link there, and consider adding the repo link too — an
  open-source project reads more credibly than a closed one.
