// Seeded defect catalogs for the buggy practice apps.
// Used by the Bug Bounty scorer to grade a learner's exploratory session.
window.APP_DEFECTS = {
  login: {
    name: "Login Form",
    url: "../practice-apps/login-broken.html",
    defects: [
      { id: "email-regex", severity: "medium", title: "Email regex accepts input without TLD", hint: "a@b passes validation" },
      { id: "email-case", severity: "high", title: "Email comparison is case-sensitive", hint: "Demo@qa.test fails with correct password" },
      { id: "email-trim", severity: "medium", title: "Email is not trimmed", hint: "Trailing space in email fails validation" },
      { id: "empty-password", severity: "critical", title: "Empty password bypasses validation", hint: "Correct email + blank password → welcome" },
      // "Password minimum length not enforced" was seeded here and has been
      // removed: it is not a defect on a login form. Length and composition
      // are registration-time rules. Enforcing them at sign-in adds no
      // security (the password either matches or it does not), leaks the
      // policy to an attacker, and locks out accounts whose passwords predate
      // the rule. Registration is where that belongs, and register's
      // pw-complexity already covers it.
      { id: "lockout-reset", severity: "medium", title: "Failed-attempt counter not cleared on success", hint: "2 fails → success → 1 fail → locked" },
      { id: "toggle-oneway", severity: "low", title: "Show/Hide password toggle is one-way", hint: "Second click does not restore password type" },
      { id: "user-enumeration", severity: "high", title: "Error message reveals whether account exists", hint: "'Wrong password' vs 'No such account' distinguishes them" },
      // The hint spells out the discovery path on purpose. Nothing in the UI
      // reveals this one, and "look harder" is not a teachable instruction —
      // the skill being taught is that a persistence claim can only be
      // verified in storage, not on screen.
      { id: "password-persisted", severity: "critical", title: "Password stored in localStorage in plaintext",
        hint: "Tick Remember me and sign in, then open DevTools → Application → Local Storage: a remembered_pw key holds the password in clear text" }
    ]
  },
  todo: {
    name: "Todo List",
    url: "../practice-apps/todo-broken.html",
    defects: [
      { id: "whitespace-todo", severity: "low", title: "Whitespace-only todos can be added", hint: "'   ' creates a blank item" },
      { id: "xss", severity: "critical", title: "User input renders as HTML (XSS)", hint: "<img src=x onerror> fires" },
      { id: "wrong-counter", severity: "medium", title: "'Items left' counts total, not incomplete", hint: "Completing an item does not decrement the label" },
      { id: "filter-inverted", severity: "high", title: "'Active' filter shows completed items", hint: "Predicate is inverted" },
      { id: "clear-all", severity: "high", title: "'Clear completed' wipes the entire list", hint: "Active items are removed too" },
      { id: "no-persistence", severity: "high", title: "State does not persist across refresh", hint: "Add a few todos, tick one, then refresh the page — everything is gone. State was never written to storage" }
    ]
  },
  cart: {
    name: "Shopping Cart",
    url: "../practice-apps/cart-broken.html",
    defects: [
      { id: "tax-basis", severity: "high", title: "Tax computed on raw subtotal, not discounted", hint: "SAVE10 on $45 → tax should be $3.24, shows $3.60" },
      { id: "shipping-basis", severity: "medium", title: "Free shipping threshold uses raw subtotal", hint: "HALFOFF on $52 → discounted $26 should ship $5.99" },
      { id: "coupon-case", severity: "medium", title: "Coupon comparison is case-sensitive", hint: "'save10' is rejected" },
      { id: "money-rounding", severity: "low", title: "Line totals show floating-point garbage",
        hint: "Add 5x Gizmo: the line total renders 29.950000000000003 while every other figure on the page is clean. The old hint here said 3x Gizmo gives 17.970000000000002 — it does not, 5.99*3 is exactly 17.97, so the documented reproduction never worked" },
      { id: "empty-checkout", severity: "high", title: "Checkout succeeds with an empty cart", hint: "With nothing in the cart, press Checkout — the order is placed and confirmed anyway" },
      { id: "negative-qty", severity: "medium", title: "Quantity can be decremented below 1", hint: "Item stays as active line at qty 0" },
      { id: "coupon-persists", severity: "medium", title: "Coupon persists across checkouts", hint: "Second order silently reuses previous discount" }
    ]
  },
  register: {
    name: "Registration Form",
    url: "../practice-apps/register-broken.html",
    defects: [
      { id: "name-length", severity: "low", title: "Full name accepts 1 character", hint: "Length check uses > 0 instead of >= 2" },
      { id: "email-regex", severity: "medium", title: "Email regex too permissive", hint: "Register with an email like a@b — no dot, no TLD — and it is accepted as valid" },
      { id: "age-boundary", severity: "medium", title: "Age boundary off by one", hint: "Age 12 accepted as valid" },
      { id: "country-missing", severity: "medium", title: "Country validation missing", hint: "'Select…' submits successfully" },
      { id: "pw-complexity", severity: "high", title: "Password complexity not enforced", hint: "aaaaaaaa (8 a's) accepted" },
      { id: "strength-lie", severity: "low", title: "Strength meter always shows 'Strong'", hint: "Regardless of password value" },
      { id: "confirm-trim", severity: "medium", title: "Confirm-password comparison trims trailing whitespace", hint: "'Passw0rd!' matches 'Passw0rd! '" },
      { id: "tos-missing", severity: "high", title: "TOS acceptance not enforced", hint: "Form submits with checkbox unchecked" },
      { id: "double-submit", severity: "medium", title: "Submit button not disabled after success", hint: "Rapid double-click submits twice" }
    ]
  },
  responsive: {
    name: "Responsive Lab",
    url: "../practice-apps/responsive-broken.html",
    defects: [
      // Three of these fire automatically, because each has a moment where the
      // defect becomes observable: the frame scrolls sideways, a control you
      // never knew existed slides into view, or your typed text vanishes. The
      // other two are steady-state layout facts with no such moment — the same
      // reason the a11y challenge's defects are hunted by eye. Auto-ticking
      // them the instant you chose a phone size would hand over the answers
      // for picking a preset.
      { id: "reflow-2d", severity: "high", title: "Content requires scrolling in two directions",
        hint: "At phone width the order summary is a fixed 420px, so the whole screen scrolls sideways as well as down. WCAG 1.4.10 Reflow" },
      { id: "clipped-cta", severity: "critical", title: "The Apply button is off-screen with no visible scrollbar",
        hint: "The promo row never wraps and scrolls inside itself. On a touch device there is no scrollbar, so the control looks absent rather than hidden" },
      { id: "tap-target", severity: "high", title: "Remove buttons shrink to 20x20 on phones",
        hint: "Measure one in DevTools at phone width. WCAG 2.2 2.5.8 asks for 24x24 (AA); iOS guidance says 44pt and Android 48dp" },
      { id: "header-eats-viewport", severity: "medium", title: "The sticky header takes 46% of the screen in landscape",
        hint: "26% in portrait and 46% rotated — the header has a natural height and the viewport does not. Measure it, do not estimate: header height over viewport height" },
      { id: "rotate-wipes-form", severity: "critical", title: "Rotating the device clears the delivery form",
        hint: "Type a name and address, then rotate. The re-render rebuilds the inputs from empty state instead of preserving what you entered" }
    ]
  },
  scheduler: {
    name: "Scheduler",
    url: "../practice-apps/scheduler-broken.html",
    defects: [
      // Every one of these is produced by the platform's own tz database via
      // Intl, not by a lookup table written to make the exercise work. A
      // learner who checks these dates against any other tool gets the same
      // answers, which is the only version of this worth shipping.
      { id: "naive-local-store", severity: "critical", title: "Events are stored as a bare wall clock with no timezone",
        hint: "The spec says a viewer elsewhere sees the same instant converted. Change your timezone with events on the agenda: nothing moves. Tokyo and Los Angeles are shown the same number" },
      { id: "dst-spring-gap", severity: "high", title: "A time that does not exist is silently accepted",
        hint: "8 Mar 2026 at 02:30 in America/New_York. Clocks jump 02:00 to 03:00, so that time never happens. The app takes it and resolves it to a different time without saying so" },
      { id: "dst-fall-duplicate", severity: "high", title: "The repeated hour is resolved without asking",
        hint: "1 Nov 2026 at 01:30 in America/New_York happens twice, an hour apart. The app picks one silently — and it is a coin flip whether it is the one the user meant" },
      { id: "duration-across-dst", severity: "high", title: "Duration is computed on the wall clock, not on elapsed time",
        hint: "Book 60 minutes from 01:30 on 1 Nov 2026. Compare the booked duration against the actual elapsed time between the two instants" },
      { id: "allday-shift", severity: "high", title: "All-day events land on the wrong date west of UTC",
        hint: "Add an all-day event, then switch to America/Los_Angeles. A date with no time was given midnight in UTC, so it renders a day early" },
      { id: "sort-lexicographic", severity: "medium", title: "The agenda sorts on the formatted time string",
        hint: "Add events at 09:00 and 10:00 and read the order. \"10:00 am\" sorts before \"9:00 am\" when you compare display strings instead of instants" }
    ]
  },
  "live-feed": {
    name: "Live Feed",
    url: "../practice-apps/live-feed-broken.html",
    defects: [
      // Timing defects, so all six are auto-detected: each has an exact moment
      // where the product contradicts itself on screen, and none of them can
      // be triggered by doing one thing at a time and waiting.
      { id: "double-submit", severity: "critical", title: "Nothing prevents a second submit while the first is in flight",
        hint: "Click Post twice quickly. The control is never disabled and there is no idempotency guard, so the message is posted twice" },
      { id: "optimistic-no-rollback", severity: "critical", title: "A failed post stays on screen labelled as sent",
        hint: "Post three times and read the save log against the row. One save is rejected and the post still says Sent — reload and it is gone" },
      { id: "stale-response", severity: "high", title: "A slower earlier search overwrites the newer results",
        hint: "Type a query quickly. The shorter query takes longer to answer, so it lands last and wins. The result count names a query you are no longer searching for" },
      { id: "duplicate-append", severity: "high", title: "Refresh appends items instead of merging them by id",
        hint: "Press Refresh feed twice without waiting. The same posts arrive again and are pushed onto the list rather than matched against what is already there" },
      { id: "lost-update", severity: "high", title: "A background refresh discards what you are typing",
        hint: "Start typing in the composer, then press Refresh feed. Nothing checks whether the field is dirty before replacing it" },
      { id: "counter-race", severity: "medium", title: "The unread counter loses increments under concurrent arrivals",
        hint: "Press Simulate 3 arrivals and read the count. Each arrival reads the old value and writes back value plus one, so simultaneous arrivals collapse into one" }
    ]
  },
  // The accessibility challenge had a 13-item answer key in prose and no
  // catalogue entry, so Bug Bounty, the auto-detector and the character sheet
  // all knew nothing about it — a learner could work it and record nothing.
  //
  // NOTE ON DETECTION: these are static markup defects, present on load rather
  // than behaviours you trigger, so js/defect-detector.js has nothing to hook.
  // That is a real difference between accessibility work and functional
  // testing, and worth knowing: you find these by inspecting and by using a
  // keyboard, not by driving the app until something misbehaves.
  a11y: {
    name: "Accessibility Challenge",
    url: "../practice-apps/a11y-challenge.html",
    defects: [
      { id: "missing-labels", severity: "high", title: "Form inputs have no <label>",
        hint: "Email and Full name are plain divs above bare inputs — click the text and focus does not move to the field. WCAG 1.3.1, 3.3.2, 4.1.2" },
      { id: "required-color-only", severity: "medium", title: "Required fields indicated by colour alone",
        hint: "The asterisk carries the meaning and nothing says 'Required' in text. WCAG 1.4.1, 3.3.2" },
      { id: "focus-removed", severity: "high", title: "Focus indicator removed with no replacement",
        hint: "Tab through the form — nothing shows where you are. outline:none with nothing put back. WCAG 2.4.7" },
      { id: "text-contrast", severity: "high", title: "Input text contrast below 4.5:1",
        hint: "Grey text on a light field. Sample the two colours in DevTools and compute the ratio. WCAG 1.4.3" },
      { id: "button-contrast", severity: "medium", title: "Button label contrast below 3:1",
        hint: "Light blue on blue. WCAG 1.4.11" },
      { id: "div-as-button", severity: "critical", title: "A div acts as a button",
        hint: "Tab to Subscribe — you cannot. It has a click handler but no role, no tabindex and no key handler, so keyboard and screen-reader users cannot activate it. WCAG 2.1.1, 4.1.2" },
      { id: "icon-no-name", severity: "high", title: "Icon-only button has no accessible name",
        hint: "The x button announces as 'button' with no purpose. WCAG 4.1.2" },
      { id: "no-fieldset", severity: "medium", title: "Checkbox group has no fieldset/legend",
        hint: "A screen reader announces three unrelated checkboxes with no idea what they belong to. WCAG 1.3.1" },
      { id: "img-no-alt", severity: "medium", title: "Image has no alt attribute",
        hint: "The logo is announced as its filename or skipped entirely. WCAG 1.1.1" },
      { id: "link-text", severity: "medium", title: "Link text is 'click here'",
        hint: "Screen-reader users navigate by pulling up a list of links. Out of context this one says nothing. WCAG 2.4.4" },
      { id: "new-window", severity: "low", title: "Link opens a new window with no warning",
        hint: "target=_blank with no indication, and no rel=noopener. WCAG 3.2.5" },
      { id: "heading-skip", severity: "low", title: "Heading levels skip from h2 to h5",
        hint: "Headings are the document outline. Skipping levels breaks navigation by heading. WCAG 1.3.1" },
      { id: "error-color-only", severity: "high", title: "Error state uses colour only and is not announced",
        hint: "Red text with no icon, no role=alert and no aria-live, so it is invisible to a screen reader and to anyone who cannot distinguish the colour. WCAG 1.4.1, 4.1.3" }
    ]
  }
};
