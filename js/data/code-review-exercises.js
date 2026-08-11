/*
 * Code Review Gauntlet exercises.
 *
 * Models the hands-on stage of an automation interview: you are handed a test
 * and asked what is wrong with it. The exercise is scored on BOTH directions —
 * defects you miss, and clean code you wrongly flag. Interviewers weigh the
 * second more than candidates expect: someone who calls everything a problem
 * is as hard to work with as someone who spots nothing.
 *
 * Every `issues` entry is either present:true (a real defect in this snippet)
 * or present:false (a decoy — a plausible-sounding criticism that does not
 * apply here). `why` is shown after grading, for both kinds.
 */
window.CODE_REVIEW_EXERCISES = [
  {
    id: "waits",
    title: "Login test with a sleep",
    difficulty: "easy",
    brief: "A colleague opens this PR and says it fixed a flaky login test. What do you raise in review?",
    code: `test('user can log in', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.fill('#email', 'qa@test.example');
  await page.fill('#password', 'Password123!');
  await page.click('#submit');

  await page.waitForTimeout(5000);

  const heading = await page.textContent('h1');
  expect(heading).toBe('Dashboard');
});`,
    issues: [
      { id: "sleep", present: true, label: "waitForTimeout is a fixed sleep, not a wait for a condition",
        why: "It is simultaneously too slow (always 5s, even when the page is ready in 200ms) and too fragile (a 6-second CI run still fails). Waiting for the thing you actually care about — an auto-retrying assertion on the heading — is both faster and more reliable." },
      { id: "snapshot", present: true, label: "textContent then expect asserts on a stale snapshot",
        why: "Reading the value first freezes it. If the heading has not rendered yet, you assert on whatever was there at that instant. `await expect(page.locator('h1')).toHaveText('Dashboard')` retries until it matches or times out — that is the whole point of web-first assertions." },
      { id: "no-assert-nav", present: true, label: "Nothing verifies the login actually succeeded before checking the heading",
        why: "A wrong-password path might also render an h1. Asserting on a post-login signal — the URL, a user menu, a logout control — is what makes the test about logging in rather than about text on a page." },
      { id: "hardcoded-creds", present: true, label: "Credentials are hard-coded in the test file",
        why: "These are fake, so this is a maintainability issue rather than a security one — but the moment someone uses a real account it is a secret in git history. Fixtures or environment config keep it out." },
      { id: "css-id", present: false, label: "Using #email and #submit as locators is too brittle",
        why: "Decoy. Stable ids are a perfectly good locator — they are near the top of the priority order. The brittle ones are generated ids (`#mui-4821`) and positional selectors. Do not flag an id just for being CSS." },
      { id: "absolute-url", present: false, label: "The test navigates to a full URL instead of a relative path",
        why: "Decoy in review terms. Using baseURL is tidier and helps run against multiple environments, but it is a config preference, not a defect — and worth raising as a nit, clearly labelled as one." }
    ],
    fixed: `test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.QA_USER);
  await page.getByLabel('Password').fill(process.env.QA_PASS);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Waits for the condition, not for the clock.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
});`
  },
  {
    id: "state",
    title: "Two tests that must run in order",
    difficulty: "medium",
    brief: "This file passes locally and fails intermittently in CI. Review it.",
    code: `let createdUserId;

test('creates a user', async ({ request }) => {
  const res = await request.post('/api/users', {
    data: { name: 'Test User', email: 'dup@test.example' }
  });
  const body = await res.json();
  createdUserId = body.id;
  expect(res.status()).toBe(201);
});

test('deletes the user', async ({ request }) => {
  const res = await request.delete('/api/users/' + createdUserId);
  expect(res.status()).toBe(204);
});`,
    issues: [
      { id: "order-dep", present: true, label: "The second test depends on state from the first",
        why: "Run them in parallel, or run the second alone with `--grep`, and `createdUserId` is undefined. Tests that only pass in one order are not tests, they are a script with assertions." },
      { id: "parallel", present: true, label: "The shared variable survives only under the default execution mode",
        why: "Worth being precise, because the folklore version is wrong. By default Playwright parallelises across FILES, while tests within one file run in order in the same worker — so `createdUserId` genuinely is shared, and that is exactly why the file passes. It breaks the moment execution changes: `fullyParallel: true`, `describe.configure({ mode: 'parallel' })`, sharding across machines, running the second test alone with `--grep`, or a retry of just the failing test. Note also that the scaffolded config sets `workers: 1` on CI, so 'it fails in CI because CI is parallel' is usually backwards — reach for retries, sharding or grep as the likelier trigger." },
      { id: "fixed-email", present: true, label: "A fixed email address collides on re-run",
        why: "The first run creates dup@test.example; if cleanup fails, the next run gets a 409 and the test fails for a reason unrelated to the change. Unique data per run — a timestamp or uuid in the local part — removes a whole class of false failures." },
      { id: "no-cleanup", present: true, label: "Cleanup happens in a test, so a failure leaks data",
        why: "If the create test fails, the delete never runs and the record is orphaned. Teardown belongs in a fixture or afterEach, which runs even when the test body throws." },
      { id: "assert-after", present: true, label: "The status is asserted after the response body is already used",
        why: "If the POST returned 500, `body.id` is undefined and the failure message is about a missing property rather than the actual HTTP status. Assert the status first so the error tells you what went wrong." },
      { id: "api-not-ui", present: false, label: "This should be a UI test, not an API test",
        why: "Decoy, and the opposite of good advice. Setting up and tearing down data via API is faster and more reliable than clicking through a UI. Pushing work down the pyramid is the right instinct." }
    ],
    fixed: `test.describe('user lifecycle', () => {
  let userId;
  const email = \`user-\${Date.now()}@test.example\`;

  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/users', { data: { name: 'Test User', email } });
    expect(res.status()).toBe(201);
    userId = (await res.json()).id;
  });

  test.afterEach(async ({ request }) => {
    // Runs even when the test body throws, so nothing leaks.
    if (userId) await request.delete(\`/api/users/\${userId}\`);
  });

  test('can be deleted', async ({ request }) => {
    const res = await request.delete(\`/api/users/\${userId}\`);
    expect(res.status()).toBe(204);
    userId = null;
  });
});`
  },
  {
    id: "locators",
    title: "The cart test that breaks every sprint",
    difficulty: "medium",
    brief: "This test fails after almost every front-end change. Diagnose it from the code.",
    code: `test('adds an item to the cart', async ({ page }) => {
  await page.goto('/shop');

  await page.click('div.sc-1x2y3z4 > div:nth-child(3) > button');
  await page.locator('.MuiButton-root').first().click();

  const badge = page.locator('//div[@id="root"]/div/header/div[2]/span');
  await expect(badge).toHaveText('1');
});`,
    issues: [
      { id: "generated-class", present: true, label: "sc-1x2y3z4 and MuiButton-root are generated class names",
        why: "Styled-components and MUI generate these at build time. They change when anything about the styling changes, which is why this breaks every sprint. They describe how the element looks, not what it is." },
      { id: "positional", present: true, label: "nth-child(3) ties the test to sibling order",
        why: "Add a promoted item to the grid and you are now clicking a different product — and the test may still pass while testing the wrong thing, which is worse than failing." },
      { id: "first", present: true, label: ".first() papers over a strict-mode violation",
        why: "It silences the error that was telling you the locator is ambiguous. When a second matching button appears, `.first()` picks whichever the DOM happens to order first. Scope to a container or filter by accessible name instead." },
      { id: "absolute-xpath", present: true, label: "The badge uses an absolute XPath from the root",
        why: "It encodes the entire DOM path, so any wrapper div added anywhere above it breaks the locator. Absolute XPath is the most fragile locator there is." },
      { id: "no-wait-cart", present: false, label: "The test needs an explicit wait after clicking add-to-cart",
        why: "Decoy. `expect(...).toHaveText('1')` already retries until the badge updates or the timeout expires. Adding a sleep here would slow the test and fix nothing — the locators are the problem." },
      { id: "single-assert", present: false, label: "A test should never contain more than one assertion",
        why: "Decoy — a rule people repeat without the reasoning. Multiple assertions verifying one behaviour are fine and often clearer. What matters is that the test has one reason to fail." }
    ],
    fixed: `test('adds an item to the cart', async ({ page }) => {
  await page.goto('/shop');

  // Scoped to the specific product, addressed the way a user sees it.
  const product = page.getByRole('listitem').filter({ hasText: 'Blue Widget' });
  await product.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByTestId('cart-count')).toHaveText('1');
});`
  },
  {
    id: "swallow",
    title: "A test that can never fail",
    difficulty: "hard",
    brief: "This test has passed every run for four months. Is that good news?",
    code: `test('checkout shows the correct total', async ({ page }) => {
  try {
    await page.goto('/checkout');
    const total = await page.locator('#total').textContent();
    if (total) {
      expect(total).toBeTruthy();
    }
    await page.screenshot({ path: 'checkout.png' });
  } catch (e) {
    console.log('checkout test skipped: ' + e.message);
  }
});`,
    issues: [
      { id: "catch-swallow", present: true, label: "try/catch swallows every failure and the test always passes",
        why: "Any error — navigation failure, missing element, wrong total — is caught and logged. Four months of green means four months of no signal. A test that cannot fail is worse than no test, because it buys false confidence." },
      { id: "truthy", present: true, label: "toBeTruthy on a string asserts almost nothing",
        why: "Any non-empty string passes: '£0.00', 'undefined', 'Error'. The test claims to check 'the correct total' and never compares against an expected value." },
      { id: "conditional-assert", present: true, label: "The assertion is inside an if, so it may not run at all",
        why: "If `total` is empty the assertion is skipped and the test still passes. A conditional assertion is an assertion you cannot rely on — the condition should itself be asserted." },
      { id: "no-expected", present: true, label: "There is no expected value anywhere — no oracle",
        why: "Nothing in the test encodes what the total SHOULD be, so it cannot detect a pricing bug. Deriving the expectation (sum the line items, or set up known cart contents) is the actual work." },
      { id: "screenshot", present: false, label: "Taking a screenshot inside the test is a defect",
        why: "Decoy. It is redundant — Playwright captures screenshots on failure via config — but it is untidy, not broken. Say so as a nit and keep the review focused on the fact that the test cannot fail." },
      { id: "id-total", present: false, label: "#total is a bad locator",
        why: "Decoy. A stable id is fine. Do not spend review attention here when the test's assertions are the problem." }
    ],
    fixed: `test('checkout total equals the sum of line items', async ({ page }) => {
  await page.goto('/checkout');

  const lines = page.getByTestId('line-total');
  // allTextContents() does NOT retry. Reading before the rows render returns
  // [], the sum is 0, and the test happily asserts £0.00 — the same stale
  // snapshot this exercise marks as a defect. Wait for the rows first.
  await expect(lines).toHaveCount(3);

  // Sum in integer pence, and keep the minus sign so a discount subtracts
  // instead of being added as a credit.
  const pence = (await lines.allTextContents())
    .map((t) => Math.round(Number(t.replace(/[^0-9.-]/g, '')) * 100))
    .reduce((a, b) => a + b, 0);

  // No try/catch: a failure here is the signal we are paying for.
  await expect(page.getByTestId('order-total'))
    .toHaveText(\`£\${(pence / 100).toFixed(2)}\`);
});`
  },
  {
    id: "pom",
    title: "A Page Object under review",
    difficulty: "hard",
    brief: "A junior has written their first Page Object. What do you tell them?",
    code: `class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.$('#email');
    this.submitBtn = page.$('#submit');
  }

  async login(email, password) {
    await (await this.emailInput).fill(email);
    await this.page.fill('#password', password);
    await (await this.submitBtn).click();
    await this.page.waitForTimeout(2000);
    expect(await this.page.title()).toBe('Dashboard');
    return true;
  }
}`,
    issues: [
      { id: "elementhandle", present: true, label: "page.$() returns an ElementHandle, resolved once in the constructor",
        why: "The handle is captured before the page has necessarily rendered, and goes stale the moment the component re-renders — producing 'element is not attached to the DOM'. A Locator re-resolves on every action, which is why Playwright recommends it." },
      { id: "assert-in-pom", present: true, label: "The Page Object asserts, so it decides what 'correct' means",
        why: "A page object should expose capabilities and state; the test owns the expectations. With the assertion buried in `login()`, every test that logs in is forced to also require the title be 'Dashboard' — and a failure blames the wrong layer." },
      { id: "pom-sleep", present: true, label: "waitForTimeout inside the page object",
        why: "It penalises every test that logs in, and hides whatever race it was added for. Waiting on a real post-login condition removes both problems." },
      { id: "return-true", present: true, label: "Returning a bare `true` conveys nothing",
        why: "It can only ever be true — the method throws otherwise. Either return something useful (the next page object) or nothing at all. `if (await login())` reads as a real check while being a constant." },
      { id: "mixed-style", present: false, label: "Half the fields use stored handles, half use inline page.fill",
        why: "Decoy, and a deliberately fine-grained one. The inconsistency is real and worth a comment — but it is a nit, not a defect, and this exercise's contract is that a ticked box means a defect. Say 'nit:' out loud in a real review and move on; spending your reviewer's attention here while a stale ElementHandle sits three lines above is the mistake being tested." },
      { id: "pom-bad", present: false, label: "Page Objects are an outdated pattern and should not be used",
        why: "Decoy, and a trap in interviews. POM is alive and widely used; Playwright also offers fixtures as an alternative for some cases. Confidently dismissing a pattern the team uses reads as inflexibility, not seniority." }
    ],
    fixed: `class LoginPage {
  constructor(page) {
    this.page = page;
    // Locators, not handles: re-resolved on every action.
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() { await this.page.goto('/login'); }

  // Performs the action and nothing else. The test decides what is correct.
  async login(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}`
  },
  {
    id: "retries",
    title: "The flake fix that was not one",
    difficulty: "medium",
    brief: "A test was flaky. This is the PR that 'fixed' it. Review the change.",
    code: `// playwright.config.js
retries: 5,
timeout: 120000,

// search.spec.js
test('search returns results', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/search');
  await page.fill('#q', 'widget');
  await page.click('#go');
  await page.waitForTimeout(10000);
  const count = await page.locator('.result').count();
  expect(count).toBeGreaterThan(0);
});`,
    issues: [
      { id: "retry-mask", present: true, label: "Raising retries to 5 hides the failure instead of fixing it",
        why: "A test that needs five attempts is telling you something real — about the test or about the product. Retries are for genuine infrastructure noise; using them as the fix means the next person inherits the bug plus a slow suite." },
      { id: "timeout-inflate", present: true, label: "Inflating timeouts to two and three minutes converts a fast failure into a slow one",
        why: "The suite now takes far longer to tell you the same thing, and a real regression that hangs will burn three minutes per attempt, times five retries." },
      { id: "sleep-10s", present: true, label: "A 10-second sleep replaces a wait for results",
        why: "Guaranteed to be both too long on a fast run and too short on a slow one. `expect(page.getByTestId('result')).toHaveCount(...)` waits exactly as long as needed." },
      { id: "weak-count", present: true, label: "greaterThan(0) does not verify the search worked",
        why: "It passes if the page shows unrelated default results, or a 'no results' block that happens to use the same class. Asserting that results relate to 'widget' is the actual behaviour under test." },
      { id: "diagnose", present: true, label: "Nothing in the PR diagnoses WHY it was flaky",
        why: "The review question to ask: what was the failure rate, and what did the trace show? Without that, this change is a guess. `--repeat-each=100` turns 'sometimes' into a number." },
      { id: "no-retries", present: false, label: "Retries should always be set to zero",
        why: "Decoy — an overcorrection. One retry in CI is a reasonable defence against genuine infrastructure flakiness, provided flaky results are reported and investigated rather than celebrated as green." }
    ],
    fixed: `// playwright.config.js — one retry, and flakes are reported, not hidden.
retries: process.env.CI ? 1 : 0,
timeout: 30000,

// search.spec.js
test('search returns matching results', async ({ page }) => {
  await page.goto('/search');
  await page.getByLabel('Search').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();

  // Waits for the real condition, and checks the results are relevant.
  const results = page.getByTestId('result');
  await expect(results.first()).toBeVisible();
  await expect(results.first()).toContainText(/widget/i);
});`
  },

  /*
   * The three below carry source:"ai" and are framed as output from an
   * assistant rather than from a colleague. That framing matters: reviewing
   * generated tests is now routine work, and its failure modes are not a
   * human's. Generated code is syntactically clean, confidently commented,
   * and wrong about INTENT — it asserts what the page does today rather than
   * what the ticket asked for. A reviewer scanning for sloppiness finds none
   * and approves it.
   */
  {
    id: "ai-implementation",
    source: "ai",
    title: "Generated from a ticket — asserts the implementation",
    difficulty: "medium",
    brief: "An assistant generated this from ticket QA-812: \"Adding an item to the basket increments the basket count shown in the header.\" It passes. Review it.",
    code: `// Verifies the basket badge updates when an item is added.
test('add to basket updates the badge', async ({ page }) => {
  await page.goto('/products/nw-114');
  await page.click('.btn.btn-primary.add-to-cart');

  await page.waitForSelector('.cart-badge.is-active');
  await expect(page.locator('.cart-badge')).toHaveClass(/is-active/);

  const count = await page.evaluate(() => window.__CART_STATE__.count);
  expect(count).toBe(1);
});`,
    issues: [
      { id: "ai-class-not-value", present: true, label: "It asserts a CSS class, not the number the ticket describes",
        why: "The ticket says the count shown in the header increments. This checks that the badge carries an is-active class. A badge rendering 0, or an empty string, or NaN passes every assertion here. Generated tests reach for whatever is easiest to assert against the current DOM, and a class name is easier than a value." },
      { id: "ai-internal-state", present: true, label: "It reads window.__CART_STATE__ — internal state a user never sees",
        why: "The most valuable thing to catch here. The test now passes whenever the state object is right and the UI is broken, which is precisely the bug the ticket exists to prevent. Assert what the user can see; if that turns out to be hard, the difficulty is itself worth reporting." },
      { id: "ai-styling-locator", present: true, label: ".btn.btn-primary.add-to-cart couples the test to styling",
        why: "Two of those three classes are visual. Changing the button from primary to secondary is a design decision that should never break a test, and it will. The behavioural part of that selector is add-to-cart on its own." },
      { id: "ai-redundant-wait", present: true, label: "waitForSelector before an auto-waiting assertion is redundant",
        why: "The expect on the next line already waits and retries. The explicit wait adds nothing but a second place to time out, with a worse error message when it does. Generated code includes these defensively because they appear throughout older material." },
      { id: "ai-fixed-slug", present: false, label: "Hard-coding /products/nw-114 makes the test brittle",
        why: "Decoy. A fixed, seeded product is the right call — it makes the test deterministic. Discovering a product at runtime adds a dependency on catalogue state, which is how you get a basket test that fails for reasons having nothing to do with the basket." },
      { id: "ai-no-gwt", present: false, label: "The test name should follow a Given/When/Then convention",
        why: "Decoy. 'add to basket updates the badge' says what is being verified in plain language, which is what a name is for. Naming conventions are worth agreeing as a team and are not a review finding." }
    ],
    fixed: `test('add to basket increments the header count', async ({ page }) => {
  await page.goto('/products/nw-114');

  const badge = page.getByTestId('cart-count');
  await expect(badge).toHaveText('0');

  await page.getByRole('button', { name: 'Add to basket' }).click();

  // The value the ticket describes, seen the way the user sees it.
  await expect(badge).toHaveText('1');
});`
  },
  {
    id: "ai-locator-today",
    source: "ai",
    title: "Generated tests that pass because of today's data",
    difficulty: "hard",
    brief: "An assistant was given ticket QA-455: \"The alerts panel shows the three most recent alerts, newest first.\" This is what it produced, and it is green in CI.",
    code: `// Confirms the alerts panel renders the three most recent alerts.
test('shows the three most recent alerts', async ({ page }) => {
  await page.goto('/alerts');

  const rows = page.locator('div > div > .row');
  await expect(rows).toHaveCount(3);

  await expect(rows.nth(0)).toContainText('Disk usage above 90%');
  await expect(rows.nth(1)).toContainText('Backup completed');
  await expect(rows.nth(2)).toContainText('Certificate expires in 14 days');
});`,
    issues: [
      { id: "ai-order-untested", present: true, label: "Nothing verifies the ordering the ticket is actually about",
        why: "The ticket says newest first. The test hard-codes three strings that happen to sit in that order in today's seed data. Reverse the sort in production and this still passes, because it never learned what newest means. The requirement most likely to regress is the one left uncovered." },
      { id: "ai-structural-locator", present: true, label: "div > div > .row is a structural locator",
        why: "It encodes the current nesting depth. Wrapping the panel in one more container — a scroll region, a theme provider, an error boundary — breaks a test that has nothing to do with any of them. Generated locators drift toward structure because structure is what is visible in the DOM they were shown." },
      { id: "ai-data-coupled", present: true, label: "It asserts seeded content that will change",
        why: "Those three strings are true of the fixture today. When somebody adds an alert to the seed data, every assertion shifts by a row and the failure reads like an ordering bug rather than a data change. Assert the rule, not the current contents." },
      { id: "ai-no-boundary", present: true, label: "Only the exactly-three case is covered",
        why: "What happens with zero alerts, with one, with fifty? Truncation is the panel's entire job, so the boundaries are the interesting cases — and the generated 'comprehensive' test covers only the state the developer happened to be looking at." },
      { id: "ai-count-strict", present: false, label: "toHaveCount(3) is too strict — it should allow at least three",
        why: "Decoy, and an actively harmful suggestion. The requirement is exactly three; loosening this would let the defect the test exists to catch sail through. Relaxing an assertion to stop a failure is how a suite quietly stops finding anything." },
      { id: "ai-needs-timeout", present: false, label: "The assertions need a longer explicit timeout, since alerts load asynchronously",
        why: "Decoy. Web-first assertions already retry until the default timeout. If they genuinely need longer, that is a performance finding to raise — not a number to raise in the test." }
    ],
    fixed: `test('shows the three most recent alerts, newest first', async ({ page }) => {
  // Seeded through the API, so the test knows what "newest" means.
  await seedAlerts(page, [
    { text: 'Oldest', at: '2026-01-01T00:00:00Z' },
    { text: 'Middle', at: '2026-02-01T00:00:00Z' },
    { text: 'Newer',  at: '2026-03-01T00:00:00Z' },
    { text: 'Newest', at: '2026-04-01T00:00:00Z' },
  ]);

  await page.goto('/alerts');
  const rows = page.getByTestId('alert-row');

  await expect(rows).toHaveCount(3);
  await expect(rows).toHaveText(['Newest', 'Newer', 'Middle']);
  await expect(page.getByText('Oldest')).toBeHidden();
});`
  },
  {
    id: "ai-coverage-illusion",
    source: "ai",
    title: "Four tests that are one test",
    difficulty: "medium",
    brief: "Asked for \"comprehensive coverage of the discount code field\", an assistant produced these four. The PR description says coverage is complete. Review it.",
    code: `test.beforeEach(async ({ page }) => await page.goto('/checkout'));

test('applies a valid discount code', async ({ page }) => {
  await page.getByLabel('Discount code').fill('TRAIL10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toHaveText('Discount applied');
});

test('applies a valid discount code in lowercase', async ({ page }) => {
  await page.getByLabel('Discount code').fill('trail10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toHaveText('Discount applied');
});

test('applies a valid discount code with spaces', async ({ page }) => {
  await page.getByLabel('Discount code').fill('  TRAIL10  ');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toHaveText('Discount applied');
});

test('rejects an invalid discount code', async ({ page }) => {
  await page.getByLabel('Discount code').fill('NOPE');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toHaveText('That code is not recognised');
});`,
    issues: [
      { id: "ai-one-partition", present: true, label: "Three of the four tests are the same equivalence class",
        why: "Uppercase, lowercase and padded are all 'a valid code, normalised' — one code path exercised three times. Four tests reads as thorough on a PR summary and buys roughly two tests' worth of confidence. This is how a generated suite inflates a coverage number without raising it." },
      { id: "ai-no-total-check", present: true, label: "Nothing checks that the discount reached the total",
        why: "Every assertion is on the confirmation message. A build that says 'Discount applied' and charges full price passes all four. The message is the easiest thing to assert and the least valuable — the money is the requirement." },
      { id: "ai-missing-rules", present: true, label: "The business rules are untested",
        why: "Expired codes, already-redeemed codes, minimum-spend thresholds, two codes stacked, a code valid only on some items. That is where discount defects actually live, and none of it is visible in the DOM — which is exactly why a generated suite working from the page cannot invent it. Someone who has read the ticket can." },
      { id: "ai-copy-coupled", present: true, label: "Assertions are coupled to exact user-facing copy",
        why: "toHaveText matches the whole string, so a full stop added by a content editor fails four tests at once. A real cost, though a smaller one than the others — a partial match, or a status role plus a stable attribute, survives copy edits." },
      { id: "ai-beforeeach", present: false, label: "The shared beforeEach hides setup and should be inlined",
        why: "Decoy. A beforeEach that puts every test at the same starting point is good practice and the opposite of a defect. Setup worth questioning is setup that differs per test, or that leaves state behind for the next one." },
      { id: "ai-parameterise", present: false, label: "These should be one parameterised test over a table of inputs",
        why: "Decoy — a nit, not a defect. Parameterising would be tidier and would not add a single case. Raise it as a suggestion clearly labelled as one; raising style at the same volume as the missing business rules is how a review loses its signal." }
    ],
    fixed: `const NORMALISES = ['TRAIL10', 'trail10', '  TRAIL10  '];

test.beforeEach(async ({ page }) => await page.goto('/checkout'));

for (const code of NORMALISES) {
  test(\`normalises \${JSON.stringify(code)}\`, async ({ page }) => {
    await applyCode(page, code);
    // The money, not the message.
    await expect(page.getByTestId('order-total')).toHaveText('$115.20');
  });
}

test('an expired code is refused and the total is unchanged', async ({ page }) => {
  await applyCode(page, 'SPRING24');
  await expect(page.getByRole('status')).toContainText(/expired/i);
  await expect(page.getByTestId('order-total')).toHaveText('$128.00');
});

test('a code below its minimum spend is refused', async ({ page }) => { /* ... */ });
test('a code already redeemed by this account is refused', async ({ page }) => { /* ... */ });
test('a second code cannot be stacked on an applied one', async ({ page }) => { /* ... */ });`
  }
];
