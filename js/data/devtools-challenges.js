/*
 * DevTools Lab challenges.
 *
 * The gap this closes, in the words of the hiring material: candidates are
 * rejected for failing "elementary tasks like running queries, using Postman,
 * or following console logs". The site covered queries (SQL Sandbox) and API
 * calls (API Lab) and never covered READING THE BROWSER.
 *
 * Every challenge follows the same shape, which is the shape of the real skill:
 * the UI tells you one thing, and the evidence says another. Your job is to go
 * and get the evidence.
 *
 * The answers are values you can only obtain by opening the relevant panel.
 * That is deliberate — a question answerable from the page would test reading
 * comprehension rather than tooling.
 */
window.DEVTOOLS_CHALLENGES = [
  {
    id: "console",
    panel: "Console",
    title: "The success message that isn't",
    open: "Press F12 (or Cmd+Option+I on a Mac) and select the Console tab.",
    task:
      "Apply the coupon below. The page will tell you it worked. The console " +
      "disagrees — read it and report the real reason the discount was not applied.",
    action: "Apply coupon SAVE20",
    // Substrings that must all appear. Kept to the load-bearing word so a
    // learner is not marked wrong for paraphrasing.
    expect: ["expired"],
    hint:
      "Look for a red entry logged at the moment you clicked. The message names " +
      "the coupon and what was wrong with it.",
    teaches:
      "A green success message is a claim by the front end, not evidence. This " +
      "is the single most common way a defect reaches production looking fine: " +
      "the UI reports optimistically and the failure is only in the log. In a " +
      "bug report, quoting the console line is what turns 'it seems wrong' into " +
      "something a developer can act on in one read."
  },
  {
    id: "network",
    panel: "Network",
    title: "The image that never arrives",
    open: "Open the Network tab, then click the button. Watch the new row appear.",
    task:
      "Load the product image. It will not render. Report the HTTP status code " +
      "the browser received for that request.",
    action: "Load product image",
    expect: ["404"],
    hint:
      "The row goes red. The Status column is the number you want — three digits.",
    teaches:
      "A broken image is a request that failed, and the status tells you whose " +
      "fault it is. 404 means the path is wrong — a front-end or content bug. " +
      "500 would mean the server broke. 403 would mean it exists and you are not " +
      "allowed it. Reporting 'the image is broken' sends someone hunting; " +
      "reporting the status and the URL usually identifies the fix immediately."
  },
  {
    id: "storage",
    panel: "Application",
    title: "\"Saved to your account\"",
    open:
      "Open the Application tab (Storage in Firefox), expand Local Storage, and " +
      "select this origin.",
    task:
      "Save the preferences below. The page claims it saved them to your account. " +
      "Find where they actually went and report the exact storage key.",
    action: "Save preferences",
    expect: ["devtools_lab_prefs"],
    hint:
      "Nothing left this browser. Look for a key that appeared the moment you " +
      "clicked — its name starts with devtools_.",
    teaches:
      "Any claim about persistence can only be checked in storage. 'Saved to " +
      "your account' implies a server; local storage means it is gone the moment " +
      "the user switches device or clears data. This is the same class of defect " +
      "as the login build storing a password in plain text — invisible on screen, " +
      "obvious the second you look at what was actually written."
  },
  {
    id: "elements",
    panel: "Elements",
    title: "The error nobody can see",
    open: "Open the Elements tab and use the picker, or right-click and Inspect.",
    task:
      "Submit the form with an invalid email. Validation fails, but no message " +
      "appears. The message exists in the DOM — find it and report the CSS " +
      "property that is hiding it.",
    action: "Submit with a bad email",
    expect: ["opacity"],
    hint:
      "Search the DOM for the error text. It is there. Then read its computed " +
      "styles — one property is set to 0.",
    teaches:
      "Present is not the same as visible, and the distinction has real " +
      "consequences. An element hidden with opacity:0 still occupies space, is " +
      "still focusable, and is still read by a screen reader — so this is " +
      "simultaneously a usability defect and an accessibility one. It also " +
      "explains a whole category of automation confusion: a test asserting the " +
      "element EXISTS passes, while a user sees nothing."
  }
];
