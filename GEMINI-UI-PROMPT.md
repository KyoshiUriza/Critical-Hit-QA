# Gemini prompt — modernize the QA Prep Hub UI

Paste the block below into Google Gemini (2.5 Pro or newer recommended — it holds long context and returns better CSS).

**Before you send it:** attach 4–6 screenshots. Gemini is meaningfully better at visual critique when it can see the thing. Suggested set:
- Home page, dark mode (full page)
- Home page, light mode
- A practice app — `practice-apps/locator-lab.html` (dense, form-heavy)
- `pages/progress.html` (data-display heavy)
- `pages/tester-lattice.html` (the most decorative screen)
- Mobile width (375px) of the home page

Screenshots are pre-generated in `design-audit/`. Regenerate any time with:

```bash
node capture-design-audit.js
```

One note when you send them: the blue "Signature Unlocked" panel near the top of the home page is a **transient toast** (it auto-dismisses after ~4s) — it was mid-animation when the shot was taken. Worth telling Gemini so it critiques the toast's placement deliberately rather than mistaking it for a static layout element.

---

## THE PROMPT — copy from here

You are a senior product designer who specializes in developer tools and technical education products. You have shipped design systems for products like Linear, Vercel, Stripe Docs, and Playwright's own site. I want your help modernizing the visual design of a web application.

### The product

**QA Prep Hub** — a free, static web app that helps Software QA candidates prepare for job interviews. The core loop is: hunt seeded bugs in deliberately broken practice apps → score your findings → write a proper bug report → export it to your portfolio. It also has learning tracks, quizzes, an interactive locator-grading lab, and an in-browser SQL sandbox.

**Who uses it:** QA engineers and QA candidates, mostly 22–40, often studying at night before an interview. Many will send the link to a recruiter or hiring manager as evidence of what they've been practicing.

**That last point is the design brief in one sentence:** this has to look like a serious professional tool, not a hobby project or a gamified study app. Credibility over delight. If a hiring manager opens it, the visual design should not be the reason they discount the candidate.

### Current state — be precise, this is the real system

It is a **zero-dependency static site**. No framework, no build step, no CSS preprocessor, no CDN. One stylesheet: `css/styles.css`, 1,205 lines / 34 KB. 34 HTML pages. All colors already run through CSS custom properties.

**Current tokens:**

```css
:root {
  --bg: #0f1419;          /* page background, dark */
  --bg-elev: #171f2a;     /* card / panel surface */
  --bg-elev-2: #1f2937;   /* inset surface, inputs, tags */
  --border: #2a3444;
  --text: #e6edf3;
  --text-dim: #9aa7b8;
  --accent: #4f9dff;      /* primary blue */
  --accent-2: #62d391;    /* success green */
  --danger: #ff6b6b;
  --warn: #f2c14e;
  --code-bg: #0b1220;
  --code-fg: #e2e8f0;
  --accent-hover: #3b8ae8;
  --on-accent: #ffffff;
  --on-accent-2: #0a1a10;
  --radius: 10px;         /* the ONLY radius token — used everywhere */
  --shadow: 0 4px 14px rgba(0,0,0,0.35);
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  --dur-fast: 120ms; --dur-med: 200ms; --dur-slow: 320ms;
  --ease: cubic-bezier(.2,.6,.2,1);
  --focus-ring: 0 0 0 3px rgba(79,157,255,0.55);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #f7f9fc; --bg-elev: #ffffff; --bg-elev-2: #eef2f7;
    --border: #dbe2ea; --text: #16202b; --text-dim: #576475;
    --accent: #1e6fd9;    /* 4.7:1 on white  */
    --accent-2: #0f7a43;  /* 5.4:1 on white  */
    --danger: #c92a2a;    /* 5.9:1 on white  */
    --warn: #8a5a00;      /* 6.3:1 on white  */
    --accent-hover: #1857ac;
    --focus-ring: 0 0 0 3px rgba(30,111,217,0.45);
  }
}
```

**Key components** (class names are stable; JS and 76 automated tests depend on many of them):
`.container` `.site-header` `.header-inner` `.nav` `.nav-toggle` `.brand` `.hero` `.hero-cta` `.lede`
`.btn` + `.btn-primary` `.btn-ghost` `.btn-danger` `.btn-success` `.btn-sm` `.btn-lg`
`.panel` (+ `.panel-accent` `.panel-warn` `.panel-danger`) `.feature-grid` `.feature-card` `.feature-icon`
`.stats-strip` `.page-header` `.two-col` `.home-section` `.resume-card` `.next-action`
`.form-field` `.form-error` `.form-success` `.data-table` `.code` `.code-sample` `.code-lang-switch`
`.quiz-choice` `.quiz-progress` `.quiz-score` `.category-tab` `.q-item` `.section-toc`
`.lab-result` (+ `-pass` `-fragile` `-strict` `-fail`) `.lab-checklist` `.sql-null` `.sql-empty`
`.rpg-chip` `.rpg-hero` `.rpg-toast` `.rpg-achievement` `.badge-buggy` `.donation-cta` `.modal` `.modal-backdrop`

### Known problems with the current design

Be blunt about these and anything else you spot:

1. **It reads as "generic dark dashboard."** The palette is a default blue-on-slate. Nothing about it says *testing tool* or has any memorable identity.
2. **Typographic scale is not a scale.** 23 distinct `font-size` values in use (0.72 / 0.75 / 0.78 / 0.8 / 0.82 / 0.85 / 0.875 / 0.88 / 0.9 / 0.92 / 0.94 / 0.95 / 1 / 1.05 / 1.1 / 1.15 / 1.25 / 1.4 / 1.6 / 1.8 / 2 / 2.4 / 3 rem). No ratio, no rhythm.
3. **One radius for everything.** `--radius: 10px` on cards, inputs, buttons, badges, modals. Flattens the visual hierarchy.
4. **No spacing tokens.** Every padding and margin is a literal px value. Panels use 20px, cards 22px, hero band 32px, app frames 24px — four near-identical containers with four different paddings.
5. **304 inline `style=""` attributes** across the HTML, mostly one-off spacing and `margin-top:0` on headings.
6. **Light mode is functional but joyless.** It was fixed for accessibility (contrast now passes AA) but never actually *designed* — it's the dark layout with lighter colors.
7. **Elevation is flat.** One shadow token, barely used. Cards, modals, and toasts all sit at the same visual depth.
8. **The system font stack is doing a lot of work** and gives it no character.

### HARD CONSTRAINTS — a proposal that breaks any of these is unusable

These are not preferences. They are architectural commitments with tests enforcing them.

1. **Zero new dependencies.** No Tailwind, no Bootstrap, no shadcn, no CSS-in-JS, no npm packages, no build step, no preprocessor. The output must be plain CSS in one file.
2. **No external resources of any kind.** A strict Content-Security-Policy blocks all cross-origin requests. **This means no Google Fonts, no CDN icon sets, no remote images.** If you propose a typeface it must be either a system-stack font or a self-hosted woff2 I can add locally — say which, and give me the exact `@font-face` and fallback stack.
3. **The site must keep working offline.**
4. **WCAG 2.1 AA is a floor, in BOTH themes.** Body text ≥ 4.5:1, UI components and large text ≥ 3:1. The current light-mode accents were specifically chosen to fix measured failures (they were 1.7:1–2.8:1 before). **Give me the computed contrast ratio for every color pair you propose.** If a ratio drops below AA the proposal is rejected.
5. **`prefers-reduced-motion` and `prefers-color-scheme` must be respected.** There is already a global reduce-motion block; don't break it.
6. **Do not rename existing classes.** JS modules and 76 Playwright tests query them. You may add new classes freely. If a rename is genuinely essential, list it separately as a breaking change with a rationale.
7. **Keep `:focus-visible` on every interactive element.** The focus ring is an accessibility fix, not decoration.
8. **`data-testid` attributes are untouchable.**
9. **No decorative images or illustration** unless it is inline SVG you write out in full.

### What I want from you

Think of this as a design system upgrade, not a reskin. Work in this order:

**1. Critique (be direct — do not soften it)**
What specifically makes this look dated or amateur? Reference the screenshots. Name the worst offender.

**2. Direction**
Propose **two distinct visual directions**, each with a one-paragraph rationale tied to the audience:
- Name each direction and describe its personality in one sentence.
- For each: what makes it *feel* like a professional testing tool rather than a generic dashboard?
- Recommend one, and say why the other loses.

**3. The token layer — for your recommended direction**
Give me a complete drop-in replacement `:root` block plus the light-mode override, containing:
- **Color:** full ramp. Keep the existing token *names* (`--bg`, `--bg-elev`, `--accent`, …) so nothing breaks; add new ones as needed. **Every value annotated with its contrast ratio against the surface it sits on, in both themes.**
- **Typography:** a real modular scale (name the ratio). Map every one of the 23 current sizes onto the new scale. Specify the font stack — system or self-hosted only.
- **Spacing:** a token scale (e.g. `--sp-1`…`--sp-8`). Tell me which value each of the four container paddings should collapse to.
- **Radius:** a scale, not one value. Say which components get which.
- **Elevation:** 3–4 shadow tokens with intent ("card at rest", "card hover", "modal", "toast") — and how they change in light mode, where dark-mode shadows disappear.
- **Motion:** keep the existing duration tokens or justify replacements.

**4. Component-level CSS**
Actual, pasteable CSS for the components that change most. Prioritize: `.btn` variants, `.panel`, `.feature-card`, `.site-header` + `.nav`, `.data-table`, `.form-field`, `.quiz-choice`, `.lab-result` states, `.code`/`.code-sample`, `.stats-strip`. Show before → after where the change is non-obvious.

**5. Migration plan**
Ordered, with effort estimates. Which changes are pure token swaps (safe, instant) versus which need HTML edits? Give me a specific plan for eliminating the 304 inline styles — which utility classes to add, and which inline patterns each replaces.

**6. What NOT to change**
Tell me what already works and should be left alone. I would rather keep a good decision than churn it.

### Output format

Markdown. Real CSS in fenced blocks, ready to paste. Contrast ratios in tables. If a suggestion is a judgement call rather than a rule, say so explicitly and give me the trade-off — I would rather have your honest opinion with its cost stated than a confident-sounding default.

Do not give me a generic "modern UI checklist." I want decisions specific to *this* product, this audience, and these constraints.

## END OF PROMPT

---

## Follow-up prompts worth having ready

Once Gemini gives you the first pass, these get the most value out of it:

**To pressure-test the contrast claims:**
> For every color pair in your proposal, recompute the WCAG contrast ratio and show your working (relative luminance for each color, then the ratio formula). I have been burned by proposals where the stated ratios were wrong — three of my accent colors were shipping at under 3:1 while documented as passing.

**To get the light theme actually designed:**
> Light mode in my current build is the dark layout with lighter colors, and it shows. Design it as its own thing: where does elevation come from without dark shadows, how do the accent colors need to shift, and which components need different treatment rather than an inverted one?

**To make it feel specific rather than generic:**
> Give me three small, high-leverage details that would make this feel unmistakably like a *testing* tool — the kind of thing a QA engineer notices and appreciates. Not skeuomorphism, not mascots. Think about what the domain's visual language actually is: pass/fail states, diffs, severity, coverage, terminal output.

**To keep it honest about cost:**
> Rank your proposed changes by visual impact per hour of implementation. If I only had time for the top three, which three, and what percentage of the total improvement would I get?

**If you want it to also design the RPG layer:**
> One section is an optional RPG progression layer (ranks, XP called "Star-Dust", unlockable abilities) themed on a LitRPG novel. It is deliberately opt-in because some users find it motivating and others find it unprofessional. How would you design it so it feels like a polished progress system rather than a game skin bolted on — and so a hiring manager seeing it does not discount the candidate?
