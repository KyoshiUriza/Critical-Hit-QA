/*
 * Windows, Tabs & Navigation — challenge definitions.
 *
 * Every practice app on this site used to live on one page that never
 * changed its URL. That made a whole category of automation unpractisable:
 * waiting for a new tab, choosing the right one out of several, telling a
 * real navigation apart from a History API push, and following a redirect to
 * where it actually lands.
 *
 * Each entry is a real behavior on the page, not a description of one. The
 * `pattern` is revealed only after the learner has triggered the control, so
 * they meet the problem before they are handed the API call.
 */
window.WINDOW_CHALLENGES = [
  {
    id: "blank-link",
    title: "A link with target=\"_blank\"",
    task:
      "Click the link and assert the new tab shows the target page, then " +
      "assert this page did not move.",
    trap:
      "The most common mistake in this whole category: after the click, your " +
      "`page` handle still points at THIS page. Assertions written against it " +
      "pass or fail for reasons that have nothing to do with the new tab.",
    pattern:
      "const [tab] = await Promise.all([\n" +
      "  context.waitForEvent('page'),\n" +
      "  page.getByTestId('open-blank').click(),\n" +
      "]);\n" +
      "await tab.waitForLoadState();\n" +
      "await expect(tab).toHaveTitle(/Window Target/);\n" +
      "// And the original is untouched:\n" +
      "await expect(page).toHaveURL(/windows-lab/);",
    teaches:
      "Wait for the page event and the click TOGETHER. Clicking first and " +
      "then waiting is a race you will lose intermittently, which is the " +
      "worst way to lose it."
  },
  {
    id: "window-open",
    title: "window.open() with dimensions",
    task: "Open the popup and assert its content, then close it from your test.",
    trap:
      "A popup is a page like any other in Playwright — there is no separate " +
      "popup API. What differs is that it may be blocked, and that its " +
      "viewport is not your project's viewport.",
    pattern:
      "const [popup] = await Promise.all([\n" +
      "  page.waitForEvent('popup'),\n" +
      "  page.getByTestId('open-popup').click(),\n" +
      "]);\n" +
      "await expect(popup.getByTestId('target-heading')).toBeVisible();\n" +
      "await popup.close();",
    teaches:
      "page.waitForEvent('popup') is scoped to the page that opened it; " +
      "context.waitForEvent('page') catches any new page in the context. " +
      "Either works here — knowing which is narrower is the point."
  },
  {
    id: "opener-access",
    title: "Which of these hands over window.opener?",
    task:
      "Open both. Each new tab reports whether it can reach back through " +
      "window.opener. Assert the difference — then check what the " +
      "target=\"_blank\" link in the first exercise reported.",
    trap:
      "The advice you will read everywhere is \"add rel=noopener to " +
      "target=_blank or you are vulnerable\". Measured in a current browser, " +
      "an anchor is severed either way — the browser implies it. What still " +
      "hands over a live handle is window.open() without noopener, and that " +
      "is the one nobody warns you about.",
    pattern:
      "const [reachable] = await Promise.all([\n" +
      "  context.waitForEvent('page'),\n" +
      "  page.getByTestId('open-unsafe').click(),\n" +
      "]);\n" +
      "await expect(reachable.getByTestId('opener-state'))\n" +
      "  .toHaveText('opener: reachable');\n" +
      "\n" +
      "const [severed] = await Promise.all([\n" +
      "  context.waitForEvent('page'),\n" +
      "  page.getByTestId('open-safe').click(),\n" +
      "]);\n" +
      "await expect(severed.getByTestId('opener-state'))\n" +
      "  .toHaveText('opener: null');",
    teaches:
      "Measured, not assumed: an anchor with target=\"_blank\" reports " +
      "opener: null here whether or not rel is set, because current browsers " +
      "imply it. window.open() does not — pass 'noopener' in the features " +
      "string. Keep rel=noopener on anchors anyway for older and non-browser " +
      "clients, but know which one is the live risk today."
  },
  {
    id: "same-tab",
    title: "A real navigation in the same tab",
    task: "Trigger it and wait for the URL to change, then come back.",
    trap:
      "Asserting immediately after the click reads the OLD page. The URL " +
      "changes before the new document is ready, and the old one is still " +
      "there for a moment.",
    pattern:
      "await page.getByTestId('go-same-tab').click();\n" +
      "await page.waitForURL(/window-target/);\n" +
      "await expect(page.getByTestId('target-heading')).toBeVisible();\n" +
      "await page.goBack();\n" +
      "await expect(page).toHaveURL(/windows-lab/);",
    teaches:
      "waitForURL waits for the navigation to commit. A web-first assertion " +
      "on an element of the new page does the same job and says more about " +
      "why you are waiting."
  },
  {
    id: "redirect",
    title: "A redirect chain",
    task:
      "Follow it and assert you end up at the FINAL destination, not the " +
      "page you were sent to first.",
    trap:
      "Waiting for the first URL passes, and then your next assertion runs " +
      "against a page that is already navigating away. This is a classic " +
      "source of \"element not attached\" flake.",
    pattern:
      "await page.getByTestId('go-redirect').click();\n" +
      "// Wait for where you END UP, not for the hop:\n" +
      "await page.waitForURL(/window-target/);\n" +
      "await expect(page.getByTestId('target-heading')).toBeVisible();",
    teaches:
      "If you need to prove the hop happened, watch responses instead of " +
      "URLs — page.on('response') sees each step, including the 3xx a " +
      "server-side redirect would produce."
  },
  {
    id: "pushstate",
    title: "The URL changes with no navigation at all",
    task:
      "Trigger it. The address bar changes. Assert what actually happened — " +
      "and what did not.",
    trap:
      "toHaveURL passes. The page never loaded. Every single-page app does " +
      "this, and a test that only checks the URL is asserting the address " +
      "bar rather than the product.",
    pattern:
      "await page.getByTestId('push-state').click();\n" +
      "await expect(page).toHaveURL(/step=2/);      // passes\n" +
      "// ...but no navigation happened. Prove the view changed instead:\n" +
      "await expect(page.getByTestId('spa-view')).toHaveText('Step 2');",
    teaches:
      "Assert the thing the user can see. The URL is a hint about state, not " +
      "evidence of it — and in an SPA it is frequently updated after the view " +
      "rather than before it."
  },
  {
    id: "three-tabs",
    title: "Three tabs at once",
    task: "Open all three and assert something about the SECOND product's tab.",
    trap:
      "context.pages() order is not something to rely on. Picking by index " +
      "gives you a test that passes locally and grabs the wrong tab on CI.",
    pattern:
      "await page.getByTestId('open-three').click();\n" +
      "await expect.poll(() => context.pages().length).toBe(4);\n" +
      "// Choose by identity, never by position:\n" +
      "const wanted = context.pages().find((p) => p.url().includes('sku=gadget'));\n" +
      "await expect(wanted.getByTestId('target-sku')).toHaveText('gadget');",
    teaches:
      "Find the page by URL or title. If several could match, that ambiguity " +
      "is worth raising — it usually means the product opened tabs a user " +
      "cannot tell apart either."
  },
  {
    id: "self-closing",
    title: "A tab that closes itself",
    task: "Open it, assert its content, and handle it disappearing.",
    trap:
      "Any call against a closed page throws. If the tab can close on a " +
      "timer, your assertions are racing it, and the failure message will " +
      "talk about a closed page rather than about your actual problem.",
    pattern:
      "const [tab] = await Promise.all([\n" +
      "  context.waitForEvent('page'),\n" +
      "  page.getByTestId('open-self-closing').click(),\n" +
      "]);\n" +
      "await expect(tab.getByTestId('target-heading')).toBeVisible();\n" +
      "await tab.waitForEvent('close');\n" +
      "expect(tab.isClosed()).toBe(true);",
    teaches:
      "Read what you need before it goes, and wait for 'close' rather than " +
      "sleeping. A tab that closes on its own is also worth questioning as a " +
      "design — the user may not have finished reading it."
  }
];
