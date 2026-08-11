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
      { id: "money-rounding", severity: "low", title: "Line totals show floating-point garbage", hint: "17.970000000000002 rendered as-is" },
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
