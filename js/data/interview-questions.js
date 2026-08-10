// Categorized interview question bank with model answers.
window.INTERVIEW_QUESTIONS = [
  // ─── FUNDAMENTALS ──────────────────────────────────────────────────
  {
    category: "Fundamentals",
    difficulty: "easy",
    question: "What is the difference between QA, QC, and Testing?",
    answer:
`QA (Quality Assurance) is process-oriented — the activities that build quality into the way software is developed (standards, reviews, defect-prevention).

QC (Quality Control) is product-oriented — checking the finished product against requirements to detect defects.

Testing is one activity within QC — the execution of the software with the intent to find defects.

Analogy: QA is the recipe and kitchen hygiene rules; QC is tasting the dish before serving; testing is the specific act of tasting.`
  },
  {
    category: "Fundamentals",
    difficulty: "easy",
    question: "Explain the difference between verification and validation.",
    answer:
`Verification: "Are we building the product right?" — checking artifacts (design docs, code) against specifications. Typically static (reviews, inspections).

Validation: "Are we building the right product?" — checking the running system meets user needs. Typically dynamic (executing the software).

Both are needed: verification catches deviations from spec; validation catches wrong specs.`
  },
  {
    category: "Fundamentals",
    difficulty: "easy",
    question: "What is a test plan and what should it contain?",
    answer:
`A test plan is a document describing the scope, approach, resources, and schedule of testing for a project.

Typical sections (IEEE 829-style):
• Test plan identifier
• Scope (features in / out)
• Test items
• Approach (levels, types, techniques)
• Pass/fail criteria and entry/exit criteria
• Test deliverables (cases, reports)
• Environment and tools
• Roles and responsibilities
• Schedule and milestones
• Risks and mitigations`
  },
  {
    category: "Fundamentals",
    difficulty: "medium",
    question: "What is the difference between severity and priority?",
    answer:
`Severity: how badly the defect affects the system's operation (technical impact).
Priority: how soon it must be fixed (business impact / urgency).

Example combinations:
• High severity, high priority: login is broken for all users
• High severity, low priority: crash in a feature scheduled for removal
• Low severity, high priority: company name is misspelled on the landing page — cosmetic, but visible to everyone
• Low severity, low priority: minor alignment issue on an internal admin page`
  },
  {
    category: "Fundamentals",
    difficulty: "medium",
    question: "Walk me through the bug lifecycle.",
    answer:
`Typical states:
1. New — bug is reported
2. Assigned — a developer is assigned
3. Open / In Progress — dev is investigating/fixing
4. Fixed — dev pushes the fix
5. Retest / Ready for QA — awaiting verification
6. Verified / Closed — QA confirms the fix works
7. Reopened — if the bug reappears
8. Rejected / Not a bug / Duplicate / Deferred — other terminal states

Every transition should be logged with who, when, and why.`
  },

  // ─── MANUAL TESTING ────────────────────────────────────────────────
  {
    category: "Manual Testing",
    difficulty: "easy",
    question: "How would you test a login page?",
    answer:
`Positive:
• Valid credentials → land on dashboard
• Case-insensitive email, trimmed whitespace

Negative:
• Empty username, empty password, both empty
• Invalid password → correct error, no user enumeration
• SQL/JS injection in username field
• Very long inputs (boundary + beyond max)

Security:
• Passwords masked
• No credentials in URL
• Account lockout after N failures
• Session/CSRF tokens present, cookies HttpOnly/Secure/SameSite

UX / Cross-cutting:
• Tab order, Enter key submits form
• Password manager fill works
• Responsive on mobile
• Localized error messages
• Accessibility: labels, ARIA, keyboard-only navigation, screen reader
• Browser compatibility

Also: "Forgot password" flow, "Remember me", MFA if applicable.`
  },
  {
    category: "Manual Testing",
    difficulty: "easy",
    question: "Explain equivalence partitioning with an example.",
    answer:
`Divide inputs into partitions where the system behaves the same. Test one value per partition.

Example: an age field 18-65 for adult ticket price.
Partitions:
• < 18 (invalid, child)
• 18-65 (valid, adult)
• > 65 (invalid or senior price)
• Non-numeric input (invalid)

Instead of testing every age, one representative from each (e.g., 12, 30, 70, "abc") covers the classes.`
  },
  {
    category: "Manual Testing",
    difficulty: "medium",
    question: "You have an ATM withdrawal feature: min $20, max $500, in $20 increments. Design boundary tests.",
    answer:
`Numeric boundaries:
• 19, 20, 21 (min boundary)
• 499, 500, 501 (max boundary)

Increment rule:
• 20 (valid), 40 (valid), 100 (valid)
• 25 (invalid — not multiple of 20)
• 0, negative amounts (invalid)

Non-numeric:
• Empty, letters, decimals like 20.50

Business logic:
• Balance $50, request $100 → insufficient funds
• Daily limit already reached
• Card expired / blocked
• Two rapid withdrawals — race condition?`
  },
  {
    category: "Manual Testing",
    difficulty: "medium",
    question: "What is exploratory testing and when should you use it?",
    answer:
`Exploratory testing: simultaneous learning, test design, and test execution — the tester actively explores the application without a pre-written script, using experience and heuristics to find defects.

Use it when:
• Requirements are unclear or evolving
• A brand-new feature needs a first pass
• Scripted tests all passed and you want to find what they missed
• Time is limited and you need maximum coverage of risk areas

Structure it with charters (a mission and a time-box), and record notes/screens so results are reproducible.`
  },
  {
    category: "Manual Testing",
    difficulty: "hard",
    question: "How do you write a good bug report?",
    answer:
`Essential fields:
• Clear, specific title (what + where): "500 error on Save when Notes field > 500 chars"
• Environment: browser/OS/build/version
• Steps to reproduce (numbered, minimal, deterministic)
• Expected result
• Actual result
• Evidence: screenshot, screen recording, HAR file, console log
• Severity + priority (with reasoning)
• Frequency: always / intermittent (X of Y tries)
• Regression? Introduced in which build?

Bad titles: "Bug in save" — no signal.
Good titles: bug + object + condition + observed symptom.`
  },

  // ─── AUTOMATION ────────────────────────────────────────────────────
  {
    category: "Automation",
    difficulty: "easy",
    question: "When should you NOT automate a test?",
    answer:
`• Features still churning — automation cost > payoff before it stabilizes.
• Exploratory testing — automation removes the humanjudgement that makes it valuable.
• One-off tests that will not run again.
• Tests requiring subjective judgment (visual polish, "feels laggy").
• Very short-lived features or prototypes.
• When the environment is impossible to control (real payment gateways, third-party services without sandboxes).

Automate the boring, repetitive, high-value regressions. Keep humans for the interesting parts.`
  },
  {
    category: "Automation",
    difficulty: "medium",
    question: "Explain the Test Pyramid.",
    answer:
`Proposed by Mike Cohn — a test suite should be shaped like a pyramid:

• Base: many unit tests (fast, cheap, isolated)
• Middle: fewer integration/API/service tests
• Top: even fewer UI/end-to-end tests (slow, brittle, expensive)

Anti-pattern: the "ice cream cone" — lots of manual UI tests, few unit tests. Slow feedback and hard to maintain.

Rule of thumb: push tests down the pyramid whenever a lower level can prove the same behavior.`
  },
  {
    category: "Automation",
    difficulty: "medium",
    question: "What is the Page Object Model? Show a small example.",
    answer:
`POM wraps each page in a class exposing element locators and high-level actions, keeping tests readable and maintenance in one place.

Example (Playwright):
class LoginPage {
  constructor(page) {
    this.page = page;
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
    this.error = page.getByRole('alert');
  }
  async login(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}

Test:
test('bad password shows error', async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('/login');
  await login.login('u@x.com', 'wrong');
  await expect(login.error).toHaveText('Invalid credentials');
});`
  },
  {
    category: "Automation",
    difficulty: "medium",
    question: "How do you handle a flaky test?",
    answer:
`Step 1 — Diagnose. Do NOT default to "retry". Common causes:
• Implicit timing (no wait for state) — fix with explicit waits.
• Test order dependency / shared state — isolate fixtures, reset DB between tests.
• Non-deterministic data (timestamps, random IDs) — mock or seed.
• External dependencies (network, third-party APIs) — mock or use a stable stub.
• Animation / debounce — wait for network idle or a specific stable signal.

Step 2 — Fix the root cause, then verify by running the test in a loop (100x) locally.

Step 3 — Only if the failure is genuinely non-deterministic and low-value, quarantine + retry with an owner and a due date — never permanently.`
  },
  {
    category: "Automation",
    difficulty: "hard",
    question: "Compare Playwright, Cypress, and Selenium.",
    answer:
`Selenium — the granddaddy. Multi-language (Java, Python, C#, JS…), massive ecosystem, W3C WebDriver protocol. Slower, no built-in auto-wait, requires more scaffolding.

Cypress — JavaScript only, runs inside the browser, developer-friendly DX with time-travel UI. Auto-waits, easy debugging. Limited: no true multi-tab, limited native cross-browser (though improving), single-origin traditionally.

Playwright — JavaScript, Python, .NET, Java. Runs OUT of the browser via CDP/WebDriver BiDi. Auto-waits, parallel execution, multiple browsers (Chromium/Firefox/WebKit), multi-tab / multi-origin, powerful trace viewer, network interception.

Rule of thumb today (2026): Playwright for new greenfield projects; Cypress if the team loves the DX and constraints are OK; Selenium if you need broad language support or must integrate with legacy grids.`
  },

  // ─── API / BACKEND ────────────────────────────────────────────────
  {
    category: "API Testing",
    difficulty: "easy",
    question: "What is the difference between REST and SOAP?",
    answer:
`REST: architectural style over HTTP; typically JSON; stateless; uses HTTP verbs (GET/POST/PUT/DELETE); lightweight and web-friendly.

SOAP: strict protocol; XML-only; uses WSDL for contracts; built-in standards for security (WS-Security), transactions, and reliability; heavier but more formal.

Use REST for most modern web/mobile APIs. Use SOAP where legacy systems, formal contracts, or WS-* features are required (banking, telecom).`
  },
  {
    category: "API Testing",
    difficulty: "medium",
    question: "What do you check when testing a REST API endpoint?",
    answer:
`Functional:
• Correct status code per scenario
• Response body: schema + values
• Correct headers (Content-Type, Cache-Control, ETag)
• Correct behavior for path/query/body params
• Idempotency where applicable (PUT, DELETE)
• Pagination, filtering, sorting

Negative:
• Invalid payloads: missing fields, wrong types, extra fields
• Auth: no token, expired token, wrong role
• Rate limiting

Non-functional:
• Response times (p95 targets)
• Concurrency: same request in parallel
• Backward compatibility with existing clients

Security:
• AuthN / AuthZ boundaries (can user A see user B's data?)
• Injection payloads
• PII in logs / responses`
  },
  {
    category: "API Testing",
    difficulty: "hard",
    question: "What is contract testing and why does it matter in microservices?",
    answer:
`Contract testing verifies that two services agree on the API between them, without needing full end-to-end integration.

Consumer-driven contracts (e.g., Pact):
1. Consumer writes a test declaring what it expects from the provider (endpoints, request/response shape).
2. That contract is published to a broker.
3. Provider verifies against the contract in its own CI.

Benefits:
• Catches breaking changes at the provider before deploying.
• Faster than spinning up full E2E stacks.
• Documents the API contract as code.

Especially valuable in microservices where teams deploy independently.`
  },

  // ─── AGILE / PROCESS ──────────────────────────────────────────────
  {
    category: "Agile & Process",
    difficulty: "easy",
    question: "How does QA fit into Scrum?",
    answer:
`QA is part of the cross-functional Scrum team, not a separate downstream gate.

Sprint activities:
• Refinement: challenge acceptance criteria, spot testability issues, define DoD.
• Planning: estimate testing effort, identify test data / environments.
• During the sprint: pair with devs, write/execute tests continuously.
• Review: demo tested increments.
• Retrospective: raise process improvements (flaky pipeline, missing envs).

Ideal: shift-left, automated regression running each PR, ready-to-ship every sprint end.`
  },
  {
    category: "Agile & Process",
    difficulty: "medium",
    question: "What is a Definition of Ready vs. a Definition of Done?",
    answer:
`Definition of Ready — a story is ready to be pulled into a sprint. Typical criteria:
• Business value clear
• Acceptance criteria defined and testable
• Dependencies identified
• UX / API details available
• Story estimated

Definition of Done — a story is truly complete. Typical criteria:
• Code merged and reviewed
• Unit + relevant integration tests passing
• Acceptance criteria met and demoed
• Documentation updated
• Deployed to a stage/QA environment
• No open critical defects`
  },
  {
    category: "Agile & Process",
    difficulty: "medium",
    question: "What are acceptance criteria and how do you write good ones?",
    answer:
`Acceptance criteria state the conditions under which a user story is accepted as done.

Common formats:
• Given / When / Then (Gherkin)
• Bulleted "must" list

Good criteria are:
• Testable — can be verified pass/fail
• Specific — no ambiguity
• Focused on behavior, not implementation
• Cover happy path + main error paths

Example:
Given a logged-in user
When they submit a comment longer than 5000 chars
Then the form shows "Max 5000 characters" and the comment is not saved.`
  },

  // ─── PERFORMANCE / SECURITY / DB ─────────────────────────────────
  {
    category: "Performance & Non-functional",
    difficulty: "medium",
    question: "Describe the different types of performance testing.",
    answer:
`• Load testing — expected number of concurrent users; verify SLAs.
• Stress testing — beyond expected load; find breaking point.
• Spike testing — sudden burst of users; verify recovery.
• Soak / endurance testing — sustained load for hours/days; find memory leaks.
• Volume testing — large amounts of data.
• Scalability testing — how the system responds to added resources (scale-out/up).

Key metrics: response time (p50/p95/p99), throughput, error rate, resource utilization (CPU, memory, DB connections).`
  },
  {
    category: "Performance & Non-functional",
    difficulty: "medium",
    question: "How would you test the security of a web application at a high level?",
    answer:
`Cover the OWASP Top 10 at minimum:
• Injection (SQL, NoSQL, command)
• Broken auth / session management (weak passwords, session fixation)
• Sensitive data exposure (no HTTPS, plaintext PII)
• XXE, broken access control (IDOR, missing role checks)
• Security misconfiguration (default creds, verbose errors)
• XSS (stored, reflected, DOM)
• Insecure deserialization
• Vulnerable dependencies
• Insufficient logging & monitoring
• SSRF

Tools: OWASP ZAP, Burp Suite, npm audit / Snyk. Combine with manual testing of auth boundaries (User A → User B's resources).`
  },
  {
    category: "Performance & Non-functional",
    difficulty: "easy",
    question: "What is accessibility testing and what standards apply?",
    answer:
`Accessibility testing verifies that people with disabilities can use the application.

Standards:
• WCAG 2.1 / 2.2 — levels A, AA (target), AAA
• Section 508 (US), EN 301 549 (EU), AODA (Ontario)
• ARIA for rich components

Checks:
• Keyboard-only navigation (Tab, Shift+Tab, Enter, Esc)
• Visible focus indicators
• Screen reader announcements (VoiceOver, NVDA, JAWS)
• Color contrast ratios (4.5:1 for body text)
• Text alternatives for images
• Form labels associated with inputs
• Responsive zoom to 200%

Tools: axe DevTools, Lighthouse, WAVE. Automation catches ~30-50% of issues; manual + assistive-tech testing is required for the rest.`
  },
  {
    category: "Behavioral",
    difficulty: "medium",
    question: "Tell me about a critical bug you found. How did you handle it?",
    answer:
`Structure your answer with STAR:

Situation — set the context (which project, near which milestone).
Task — what were you responsible for.
Action — what you specifically did: how you found the bug (exploratory, log analysis, edge case), how you reproduced it, how you triaged severity/priority, how you communicated it to devs and stakeholders.
Result — outcome: bug fixed before ship, incident avoided, process improvement adopted (added a regression test, closed a testing gap).

Interviewers listen for: clear reproduction, judgment about severity, collaborative communication, prevention (not just detection).`
  },
  {
    category: "Behavioral",
    difficulty: "hard",
    question: "A developer says 'It works on my machine' and refuses to reproduce a bug you filed. What do you do?",
    answer:
`Approach:
1. Depersonalize — the goal is a working product, not to win the argument.
2. Provide airtight evidence: full environment details, exact build/commit, deterministic steps, screen recording, HAR file, server logs if available.
3. Offer to pair — screen-share and reproduce together on their machine and yours.
4. If genuine environment difference, chase the root cause together (config, feature flag, data state, network, browser version).
5. If still blocked, escalate transparently: not as a complaint, but "we need help getting alignment on repro."

Long-term: if this is a pattern, raise it in retro. Consider standard test environments so "my machine" is not an argument.`
  }
];
