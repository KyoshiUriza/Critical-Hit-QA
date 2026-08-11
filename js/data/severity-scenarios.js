// Severity and priority calibration scenarios.
//
// Every scenario is written so that the CONTEXT decides the answer, not the
// symptom. That is the whole skill: a crash is not automatically P0 and a typo
// is not automatically P3. Scenarios where the two axes diverge are the
// teaching ones, so most of these diverge on purpose.
//
// Scales match the rest of the site: low | medium | high | critical for
// severity, P0..P3 for priority. Grading is band-tolerant by design — see
// js/severity-drill.js. Calibration is a defensible judgment, not a fact, and
// a drill that pretends otherwise teaches learners to argue from authority.
window.SEVERITY_SCENARIOS = [
  {
    id: "logo-typo",
    title: "The company name is misspelled in the site header",
    context:
      "The header on every page reads \"Nortwhind Outfitters\". Nothing is " +
      "broken — every link works, checkout completes, no data is affected. " +
      "It went live this morning and the company is running a paid campaign " +
      "driving traffic to the homepage this week.",
    severity: "low",
    priority: "P0",
    why:
      "Severity measures technical impact and there is none: no function " +
      "fails, no data is wrong, there is no workaround needed because nothing " +
      "is blocked. Priority measures how urgently the business needs it " +
      "fixed, and every visitor to a paid campaign is seeing a misspelled " +
      "brand name. This is the cleanest example of the two axes disagreeing, " +
      "and it is why teams that track only one number keep shipping the " +
      "wrong thing first.",
    changes:
      "If the same typo were on an internal admin screen, severity would be " +
      "unchanged and priority would drop to P3. The defect did not change — " +
      "the audience did."
  },
  {
    id: "admin-export-crash",
    title: "Bulk export crashes the admin tool",
    context:
      "Exporting more than 5,000 rows crashes the page and the admin has to " +
      "sign in again. Two staff use this feature, roughly once a quarter, for " +
      "an audit. Exporting in batches of 1,000 works fine and takes them " +
      "about ten minutes. Nothing is lost when it crashes.",
    severity: "high",
    priority: "P3",
    why:
      "A crash that loses the session is high severity by any reasonable " +
      "definition — the feature does not work and the user is thrown out. " +
      "Priority is low anyway: two people, four times a year, with a " +
      "documented workaround that costs ten minutes. Reporting this as P1 " +
      "because it crashes is the single most common calibration mistake, and " +
      "it is how testers lose the argument the next time something really " +
      "is urgent.",
    changes:
      "If the crash corrupted the export instead of failing cleanly, severity " +
      "would go critical and priority would jump — silent wrong data in an " +
      "audit is far worse than a loud failure."
  },
  {
    id: "tenant-leak",
    title: "Search returns results belonging to other customers",
    context:
      "On a multi-tenant SaaS product, searching for a common term " +
      "occasionally returns records from a different company's account. It " +
      "reproduces about one time in twenty. No customer has reported it; you " +
      "found it while testing something else.",
    severity: "critical",
    priority: "P0",
    why:
      "Cross-tenant data exposure is a breach, not a bug. Intermittency does " +
      "not reduce it — one in twenty across every search on the platform is a " +
      "large number, and the reproduction rate is a measure of your test " +
      "data, not of the risk. \"No customer has reported it\" is not evidence " +
      "of absence; it is evidence that nobody has noticed yet, which is worse " +
      "because the disclosure clock may already be running.",
    changes:
      "Nothing about this drops below P0 while it is unfixed. The only " +
      "legitimate move is to reduce exposure while the fix is built — " +
      "disabling search is a defensible mitigation."
  },
  {
    id: "reset-email",
    title: "Password reset emails are not being delivered",
    context:
      "The reset endpoint returns success and shows \"Check your inbox\", but " +
      "no email arrives. Started after last night's deploy. Anyone who has " +
      "forgotten their password cannot get back in, and there is no other " +
      "recovery path.",
    severity: "critical",
    priority: "P0",
    why:
      "Included because the two axes usually DO agree, and a drill made " +
      "entirely of trick questions would miscalibrate you in the other " +
      "direction. Users are locked out with no workaround, it is a regression " +
      "from a known deploy, and support volume will rise every hour. The " +
      "false success message makes it worse: users will not raise a ticket " +
      "because the product told them it worked.",
    changes:
      "If an admin could trigger a reset manually, priority stays P0 but the " +
      "report should say so — a workaround support can use today is worth " +
      "more in the ticket than an extra severity band."
  },
  {
    id: "date-format",
    title: "Dates render as MM/DD/YYYY for UK users",
    context:
      "The delivery date on the order confirmation always renders in US " +
      "format. UK customers see 04/03/2026 for the 3rd of April. The UK store " +
      "is currently in a closed beta with 40 users; the public UK launch is " +
      "in nine days and is the quarter's headline objective.",
    severity: "medium",
    priority: "P1",
    why:
      "The severity is not cosmetic and not critical: nothing fails, but the " +
      "information shown is genuinely ambiguous and half the year it is " +
      "silently wrong rather than obviously wrong — a customer expecting the " +
      "4th of March plans around the wrong date. Priority is driven entirely " +
      "by the launch nine days out. Same defect, same severity, and the " +
      "priority would be P3 if the UK launch were a year away.",
    changes:
      "Ambiguity is what makes this worse than a formatting nit. A date " +
      "rendered as 2026-04-03 would be unfamiliar but never misread, which is " +
      "the argument for ISO in the fix."
  },
  {
    id: "session-in-url",
    title: "The session token is passed in the URL query string",
    context:
      "After signing in, users land on /dashboard?token=eyJhbGciOi... The " +
      "product works correctly and nobody has complained. The token is valid " +
      "for 30 days. Browser history, server access logs, and the Referer " +
      "header sent to any third-party asset all capture it.",
    severity: "critical",
    priority: "P0",
    why:
      "Nothing visibly misbehaves, which is exactly why this one gets " +
      "under-rated. A 30-day credential is being written to browser history, " +
      "log aggregation, and any external host that receives a Referer — a " +
      "shared or restored machine hands over an account, and log access " +
      "becomes account access. Severity is about impact if exploited, not " +
      "about whether anyone has noticed.",
    changes:
      "A 60-second token would drop this materially — probably high rather " +
      "than critical. Lifetime is the variable that matters most in " +
      "credential-exposure defects, and the report should always state it."
  },
  {
    id: "remember-me",
    title: "\"Remember me\" expires after 24 hours instead of 30 days",
    context:
      "The specification says the remembered session lasts 30 days. It " +
      "actually lasts 24 hours, so users are asked to sign in again daily. " +
      "Sign-in works correctly, nothing is lost, and no data is affected.",
    severity: "medium",
    priority: "P2",
    why:
      "A clear deviation from a written specification, which makes it " +
      "undeniably a defect — but the impact is friction, not failure. New " +
      "testers often rate spec deviations high on the grounds that the spec " +
      "was violated. Severity measures the consequence of the deviation, not " +
      "the fact of it. A daily sign-in is an annoyance that a real user " +
      "tolerates.",
    changes:
      "If the shortened session were caused by tokens being invalidated " +
      "server-side at random, the symptom would look identical and the " +
      "severity would be much higher. Diagnosing WHY changes the answer, " +
      "which is a good reason not to file on symptom alone."
  },
  {
    id: "rounding",
    title: "Order totals are one cent off on baskets over $1,000",
    context:
      "Tax is rounded per line item and then summed, so large baskets are " +
      "occasionally out by a cent against the finance system's total. About " +
      "200 orders a month are affected. Customers have not complained; " +
      "finance raised it during reconciliation.",
    severity: "high",
    priority: "P1",
    why:
      "The amount is trivial and the category is not. Money that does not " +
      "reconcile is an accounting and audit problem regardless of size, and " +
      "the error is systematic rather than random — it will not average out. " +
      "\"It's only a cent\" is the argument that keeps this open for a year; " +
      "\"200 orders a month fail reconciliation\" is the one that gets it " +
      "fixed. Same defect, different sentence.",
    changes:
      "If it were one cent in favor of the customer on one order ever, this " +
      "would be low and P3. Systematic and reconciliation-visible is what " +
      "raises it."
  },
  {
    id: "slow-report",
    title: "A monthly report now takes 8 seconds instead of 2",
    context:
      "The management report has gone from about 2 seconds to about 8 since " +
      "the last release. It is run a few times a month. It still completes " +
      "and the output is correct. Timings show the same growth pattern on the " +
      "three other reports that share the query layer.",
    severity: "medium",
    priority: "P2",
    why:
      "Eight seconds on a monthly report is, by itself, low severity and P3 " +
      "— correct output, tiny audience, no workaround needed. What raises it " +
      "is the last sentence: the same regression is visible across everything " +
      "sharing that layer, so this report is a symptom and not the defect. " +
      "Filing the symptom at its own impact is how a systemic regression gets " +
      "closed as won't-fix four times.",
    changes:
      "Without the shared-layer evidence this is genuinely low and P3, and " +
      "rating it that way would be correct. The evidence is what moves it, " +
      "which is why the investigation belongs before the severity field."
  },
  {
    id: "old-ios",
    title: "The app crashes on launch on iOS 12",
    context:
      "The app crashes immediately on iOS 12. Analytics show 0.2% of sessions " +
      "on that version and falling. The published support policy is \"the " +
      "current iOS version and the two before it\", which iOS 12 has not been " +
      "for years. Those users cannot use the app at all.",
    severity: "high",
    priority: "P3",
    why:
      "For an affected user this is total loss of function, which is high " +
      "severity — severity is not scaled down by how few people hit it, and " +
      "collapsing the two axes into one is exactly what the priority field " +
      "exists to prevent. Priority is where the 0.2% and the published " +
      "support policy belong, and both point at P3 or a deliberate won't-fix.",
    changes:
      "A won't-fix here is a legitimate outcome and worth writing that way — " +
      "explicitly out of the support policy, with the analytics attached. " +
      "\"Closed: not supported\" with evidence ends the discussion; closing " +
      "it silently invites the same bug to be refiled next quarter."
  }
];
