// Locator exercises. Each targets one element inside the sandbox and teaches a
// specific failure mode: strict-mode violations, generated class names,
// positional selectors, dynamic ids, and text that changes with state.
//
// `target`      — CSS selector identifying the correct element (used to grade)
// `traps`       — selectors a learner commonly reaches for that LOOK right but
//                 are brittle; each explains why it will eventually break
// `idealHint`   — what a resilient answer looks like, revealed on request
window.LOCATOR_EXERCISES = [
  {
    id: "submit-button",
    title: "The submit button",
    brief: "Target the button that submits the signup form.",
    target: "#lab-signup button[type='submit']",
    difficulty: "easy",
    teaches: "Prefer roles and accessible names over classes.",
    traps: [
      { pattern: /\.btn-a7f3c2|\.css-[a-z0-9]{5,}|\.sc-[A-Za-z]{6,}/i,
        why: "That class is build-generated. It changes every time the bundler runs — a classic source of overnight red suites." },
      { pattern: /nth-child|nth-of-type|:eq\(|\[\d+\]/i,
        why: "Positional selectors break the moment anyone adds, removes, or reorders a sibling." }
    ],
    idealHint: "getByRole('button', { name: 'Create account' }) — or [data-testid=\"signup-submit\"] if the role query is ambiguous.",
    playwright: {
      js: "await page.getByRole('button', { name: 'Create account' }).click();",
      ts: "await page.getByRole('button', { name: 'Create account' }).click();"
    }
  },
  {
    id: "duplicate-delete",
    title: "The second row's Delete button",
    brief: "Three rows each have a Delete button. Target the one in the row for \"Invoice #1042\" — without relying on its position.",
    target: "#lab-table tr[data-invoice='1042'] button.row-delete",
    difficulty: "medium",
    teaches: "Strict-mode violations, and scoping by a stable ancestor.",
    traps: [
      { pattern: /^(\.row-delete|button\.row-delete)$/i,
        why: "This matches all three Delete buttons. Playwright throws a strict-mode violation rather than guessing which one you meant." },
      { pattern: /nth-child\(2\)|nth-of-type\(2\)|\.first\(\)|\.nth\(1\)/i,
        why: "Row order is data, not structure. Sort the table or add an invoice and this points at the wrong record — the worst kind of failure, because it still passes." }
    ],
    idealHint: "Scope to the row first: getByRole('row', { name: /Invoice #1042/ }).getByRole('button', { name: 'Delete' }).",
    playwright: {
      js: "await page\n  .getByRole('row', { name: /Invoice #1042/ })\n  .getByRole('button', { name: 'Delete' })\n  .click();",
      ts: "await page\n  .getByRole('row', { name: /Invoice #1042/ })\n  .getByRole('button', { name: 'Delete' })\n  .click();"
    }
  },
  {
    id: "dynamic-id",
    title: "The email field with a rebuilt id",
    brief: "Target the email input. Look at its id first — then decide whether to use it.",
    target: "#lab-signup input[type='email']",
    difficulty: "medium",
    teaches: "Recognising generated ids before they burn you.",
    traps: [
      { pattern: /#input-\d{4,}|#mui-\d+|#:r[0-9a-z]+:/i,
        why: "That id is generated per render. It is different on the next page load — the single most common cause of \"it passed locally, failed in CI\"." }
    ],
    idealHint: "getByLabel('Email address') — the label is user-visible, so it only changes when the UI genuinely changes.",
    playwright: {
      js: "await page.getByLabel('Email address').fill('qa@test.com');",
      ts: "await page.getByLabel('Email address').fill('qa@test.com');"
    }
  },
  {
    id: "stateful-text",
    title: "The cart toggle (text changes with state)",
    brief: "Target the cart toggle button. Careful: its label changes once items are added.",
    target: "#lab-cart-toggle",
    difficulty: "hard",
    teaches: "Why matching on volatile text produces intermittent failures.",
    traps: [
      { pattern: /text=["']?Cart \(0\)|:has-text\(["']Cart \(0\)/i,
        why: "The label becomes \"Cart (1)\" as soon as anything is added. Your test passes on an empty cart and fails on a full one — intermittently, depending on test order." },
      { pattern: /getByText\(['"]Cart/i,
        why: "Same problem: the visible text carries the item count, so it is state, not identity." }
    ],
    idealHint: "Use the stable hook: getByTestId('cart-toggle'), or getByRole('button', { name: /^Cart/ }) if you must match text.",
    playwright: {
      js: "await page.getByTestId('cart-toggle').click();",
      ts: "await page.getByTestId('cart-toggle').click();"
    }
  },
  {
    id: "nested-modal",
    title: "The Confirm button inside the modal",
    brief: "Open the modal, then target its Confirm button — not the identical one behind it on the page.",
    target: "#lab-modal button[data-testid='modal-confirm']",
    difficulty: "hard",
    teaches: "Scoping to a container to avoid matching hidden duplicates.",
    traps: [
      { pattern: /^(button|\.confirm-btn|button\.confirm-btn)$/i,
        why: "There is an identical Confirm button in the page behind the modal. This matches both — strict-mode violation, or worse, it clicks the wrong one." },
      { pattern: /nth-child|nth-of-type|\.last\(\)|\.nth\(/i,
        why: "Positional disambiguation works until someone adds a third Confirm somewhere." }
    ],
    idealHint: "Scope to the dialog: getByRole('dialog').getByRole('button', { name: 'Confirm' }).",
    playwright: {
      js: "await page\n  .getByRole('dialog')\n  .getByRole('button', { name: 'Confirm' })\n  .click();",
      ts: "await page\n  .getByRole('dialog')\n  .getByRole('button', { name: 'Confirm' })\n  .click();"
    }
  },
  {
    id: "deep-xpath",
    title: "The status badge",
    brief: "Target the status badge for the active subscription. Resist the urge to copy the XPath from DevTools.",
    target: "#lab-subscription [data-testid='sub-status']",
    difficulty: "medium",
    teaches: "Why 'Copy full XPath' is a trap.",
    traps: [
      { pattern: /^\/html|\/body\/|\/div\[\d+\]\/div\[\d+\]/i,
        why: "Absolute XPath encodes the entire DOM path. One extra wrapper div anywhere above it — a new layout container, an A/B test — and every locator using it breaks at once." }
    ],
    idealHint: "getByTestId('sub-status'), or getByRole('status') if the element carries that role.",
    playwright: {
      js: "await expect(page.getByTestId('sub-status')).toHaveText('Active');",
      ts: "await expect(page.getByTestId('sub-status')).toHaveText('Active');"
    }
  }
];
