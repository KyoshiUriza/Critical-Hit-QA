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
    teaches: "Recognizing generated ids before they burn you.",
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
  },

  // ── Hard region: no data-testid exists anywhere in this section. ──────
  // These are the exercises the lab was missing. Every earlier target had a
  // testid available, so the "ideal" answer was always the same shortcut and
  // the grading never tested judgment. Real applications rarely hand you one.
  {
    id: "team-row-action",
    title: "Revoke access for one person",
    brief: "Three rows, three identical Revoke buttons, no test ids and no stable ids. Target the Revoke button on Dana Whitfield's row only.",
    target: ".lab-hard tbody tr:nth-child(3) button",
    difficulty: "hard",
    noTestId: true,
    teaches: "Scoping by content is what makes a row action durable. The row is identified by the data it contains, which is the one thing that does not move.",
    traps: [
      { pattern: /nth-child|nth-of-type|\.nth\(|\.last\(|\.first\(/i,
        why: "Row order is not identity. Sort the table, add a member, or let the API return a different order and this points at somebody else — while still passing." },
      { pattern: /css-[0-9a-f]{4,}/i,
        why: "Those class names are bundler output. They change on a build you had nothing to do with." }
    ],
    idealHint: "getByRole('row', { name: /Dana Whitfield/ }).getByRole('button', { name: 'Revoke' }) — find the row by its content, then the action within it.",
    playwright: {
      js: "await page.getByRole('row', { name: /Dana Whitfield/ })\n  .getByRole('button', { name: 'Revoke' })\n  .click();",
      ts: "await page.getByRole('row', { name: /Dana Whitfield/ })\n  .getByRole('button', { name: 'Revoke' })\n  .click();"
    }
  },
  {
    id: "label-only-input",
    title: "The input with nothing on it",
    brief: "Target the 'Invite by username' field. It has no id, no name, no placeholder and no test id — only its label.",
    target: ".lab-hard-form label:nth-of-type(2) input",
    difficulty: "hard",
    noTestId: true,
    teaches: "A label is user-visible copy: if it changes, a human decided it should. That makes it a better handle than any attribute a developer might rename silently.",
    traps: [
      { pattern: /input\[type=['\"]?text/i,
        why: "Typing by input type is not identity either — the moment a second text input appears in this form, this matches two things." },
      { pattern: /nth-of-type|nth-child/i,
        why: "Positional again. Reorder the two fields and this quietly targets the email input instead." }
    ],
    idealHint: "getByLabel('Invite by username') — the label is the only durable handle here, which is exactly why the priority order puts it second.",
    playwright: {
      js: "await page.getByLabel('Invite by username').fill('kyoshi');",
      ts: "await page.getByLabel('Invite by username').fill('kyoshi');"
    }
  },
  {
    id: "ambiguous-link",
    title: "One of three identical links",
    brief: "Three cards each contain a link reading 'Read more'. Target the one inside the Security card.",
    target: ".lab-hard-cards article[aria-label='Security'] a",
    difficulty: "hard",
    noTestId: true,
    teaches: "When the text is genuinely ambiguous, the fix is a scope, not a more specific string. Find the container by its accessible name, then the link inside it.",
    traps: [
      { pattern: /\.first\(|\.last\(|\.nth\(|nth-child|nth-of-type/i,
        why: "Picking by position silences the ambiguity instead of resolving it. Reorder the cards and the test still passes — against the wrong link." },
      { pattern: /css-[0-9a-f]{4,}/i,
        why: "Generated class. It identifies the styling, not the card." }
    ],
    idealHint: "getByRole('article', { name: 'Security' }).getByRole('link', { name: 'Read more' }) — the card is an <article>, so its role is article, not region. A named <section> would be region.",
    playwright: {
      js: "await page.getByRole('article', { name: 'Security' })\n  .getByRole('link', { name: 'Read more' })\n  .click();",
      ts: "await page.getByRole('article', { name: 'Security' })\n  .getByRole('link', { name: 'Read more' })\n  .click();"
    }
  }
];
