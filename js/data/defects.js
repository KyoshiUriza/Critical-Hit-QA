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
  }
};
