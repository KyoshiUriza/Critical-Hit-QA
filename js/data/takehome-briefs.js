/*
 * Take-home assignment briefs.
 *
 * The gap this closes: the site had every component of the modern take-home
 * stage — buggy apps, charters, builders, a defect catalog, portfolio export
 * — and no assembly of it. No brief, no clock, no rubric, no submission. So a
 * learner practiced the pieces and never once practiced the thing an employer
 * actually sets.
 *
 * Each brief reads the way a real one does: business context first, a scope
 * that is narrower than the app, an explicit deliverable, and a time box. The
 * scope matters most — half of what a take-home grades is whether you stayed
 * inside it.
 */
window.TAKEHOME_BRIEFS = [
  {
    id: "checkout",
    app: "cart",
    url: "../practice-apps/cart-broken.html",
    title: "Pre-release check on the checkout flow",
    minutes: 45,
    from: "Priya Raman, Engineering Manager",
    context:
      "We are shipping a pricing change on Thursday. The cart went through code " +
      "review but nobody outside the team has used it. I need to know whether it " +
      "is safe to release, and if not, what specifically is wrong.",
    scope: [
      "The cart and checkout flow only — adding items, quantities, coupons, totals, and placing an order.",
      "Do not review the product catalog or the site navigation.",
      "Assume the visual design is signed off. Layout nitpicks are out of scope."
    ],
    deliverable:
      "One bug report for the single most serious defect you find, written well " +
      "enough that a developer can act on it without asking you anything. Plus a " +
      "short note on your overall release recommendation.",
    // What a reviewer would actually weight, shown after submission.
    rubric: [
      { id: "found-critical", label: "Found at least one high or critical defect",
        why: "Coverage that misses the expensive defects is not coverage. Two of the seeded defects in this app affect money directly." },
      { id: "severity-sane", label: "Severity is defensible",
        why: "Marking a cosmetic issue Critical, or a money error Low, is the fastest way to lose a reviewer's trust in the rest of your report." },
      { id: "repro-steps", label: "Steps are numbered and deterministic",
        why: "'Add some items and check the total' is not reproducible. A reviewer should be able to follow your steps without you in the room." },
      { id: "expected-actual", label: "Expected and actual are separated",
        why: "Burying the 'should have' inside prose is the most common weakness in junior bug reports." },
      { id: "recommendation", label: "Gave a clear release recommendation",
        why: "The manager asked a yes/no question. Answer it, with the risk stated — that is what makes you a partner rather than a ticket generator." }
    ],
    // Defects a strong submission is expected to reach, by severity.
    expectHigh: ["tax-basis", "empty-checkout"]
  },
  {
    id: "signup",
    app: "register",
    url: "../practice-apps/register-broken.html",
    title: "Security review of the registration form",
    minutes: 45,
    from: "Tomasz Bielski, Principal Engineer",
    context:
      "Legal has asked us to confirm the signup form enforces what our policy " +
      "says it does before we open registration to the public. I would rather " +
      "find out from you than from a penetration test.",
    scope: [
      "The registration form's validation rules only.",
      "The stated policy: name at least 2 characters, valid email with a TLD, 13 or older, country required, password 8+ with upper, lower, digit and symbol, and Terms must be accepted.",
      "Ignore styling and copy. We want to know what the form lets through."
    ],
    deliverable:
      "A bug report for the most serious policy violation, and a list of every " +
      "rule you found unenforced. Say which one you would block release on.",
    rubric: [
      { id: "found-critical", label: "Found at least one high-severity gap",
        why: "Unenforced password complexity and an unenforced Terms checkbox are both the kind of finding a security reviewer is specifically looking for." },
      { id: "severity-sane", label: "Severity reflects real consequence",
        why: "A 1-character name and an unenforced Terms acceptance are not the same risk. Ranking them identically suggests you are not thinking about impact." },
      { id: "repro-steps", label: "Steps include the exact input used",
        why: "'Entered a weak password' is not reproducible. 'Entered aaaaaaaa' is." },
      { id: "expected-actual", label: "Cited the policy as the oracle",
        why: "The brief gave you the spec. A report that says 'should be stronger' rather than 'policy requires a symbol; the form accepted none' is opinion rather than evidence." },
      { id: "recommendation", label: "Named what you would block on",
        why: "Prioritizing under someone else's constraints is the judgment being assessed." }
    ],
    expectHigh: ["pw-complexity", "tos-missing"]
  },
  {
    id: "login-audit",
    app: "login",
    url: "../practice-apps/login-broken.html",
    title: "Authentication audit before an enterprise pilot",
    minutes: 30,
    from: "Amara Osei, QA Lead",
    context:
      "A prospective customer's security team will review our login before they " +
      "sign. I want our own findings first so we are not surprised. Their " +
      "reviewer will look at storage as well as behavior.",
    scope: [
      "The sign-in form and the Remember me option.",
      "Valid credentials are demo@qa.test / Passw0rd!.",
      "Include anything you find outside the visible UI — that is explicitly in scope here."
    ],
    deliverable:
      "A bug report for the finding you would least want a customer's security " +
      "team to discover first, plus a one-line summary of everything else you saw.",
    rubric: [
      { id: "found-critical", label: "Found a critical-severity defect",
        why: "There are two criticals in this build. A 30-minute audit that surfaces neither has missed the point of the exercise." },
      { id: "severity-sane", label: "Distinguished security findings from usability ones",
        why: "A one-way Show-password toggle and a plaintext stored password are both defects. Treating them as comparable is the error." },
      { id: "repro-steps", label: "Steps a reviewer can follow exactly",
        why: "Especially for anything found outside the UI — say where you looked, not just what you saw." },
      { id: "expected-actual", label: "Stated the expected behavior explicitly",
        why: "'Should be more secure' is not an expectation. 'Remember me should persist the email only' is." },
      { id: "recommendation", label: "Prioritized for the audience named in the brief",
        why: "The brief said a customer's security team. The finding you lead with should be chosen for that reader." }
    ],
    expectHigh: ["password-persisted", "user-enumeration", "empty-password"]
  }
];
