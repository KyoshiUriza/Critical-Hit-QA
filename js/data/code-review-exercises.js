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
      { id: "parallel", present: true, label: "Shared mutable module state breaks under parallel workers",
        why: "Playwright runs files in parallel by default, and each worker gets its own module instance — so the variable is not even shared the way the author assumes. This is the specific reason it passes locally (often serial) and fails in CI (parallel)." },
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

  const prices = await page.getByTestId('line-total').allTextContents();
  const expected = prices
    .map((p) => Number(p.replace(/[^0-9.]/g, '')))
    .reduce((a, b) => a + b, 0);

  // No try/catch: a failure here is the signal we are paying for.
  await expect(page.getByTestId('order-total'))
    .toHaveText(\`£\${expected.toFixed(2)}\`);
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
      { id: "mixed-style", present: true, label: "Half the fields use stored handles, half use inline page.fill",
        why: "Not a bug in itself, but inconsistency in a base class propagates. Pick locators as fields and use them everywhere, so there is one pattern to learn." },
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
  }
];
