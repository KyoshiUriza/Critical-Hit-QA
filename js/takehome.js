/*
 * Take-Home Simulator.
 *
 * Runs a briefed, timed assignment end to end: read the brief, open the app,
 * hunt, write the report, submit. On submit it grades what can be graded
 * objectively (which seeded defects you actually reached, and whether the
 * report has the parts a reviewer needs) and hands back a rubric for the parts
 * that need a human eye.
 *
 * Two deliberate design decisions:
 *
 *  1. THE CLOCK DOES NOT STOP YOU. It records elapsed time and keeps going.
 *     A timer that locks the page turns a practice exercise into an anxiety
 *     machine, and real take-homes are trusted-honor anyway. What matters is
 *     that you know how long you took, because "I spent four hours on a
 *     90-minute assignment" is a real thing candidates do and never notice.
 *
 *  2. DEFECT DETECTION IS THE GRADER'S EVIDENCE. The auto-detection built for
 *     Bug Bounty already records which defects you genuinely triggered, so the
 *     simulator can tell "found and reported" from "reported without finding"
 *     — which is exactly the distinction an interviewer is making.
 */
(function () {
  "use strict";

  var KEY = "qaprep_takehome_run";
  var BRIEFS = window.TAKEHOME_BRIEFS || [];

  function el(id) { return document.getElementById(id); }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ── run state ─────────────────────────────────────────────────────────
  function loadRun() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object" && raw.briefId && raw.startedAt) return raw;
    } catch (_) {}
    return null;
  }
  function saveRun(run) {
    try { sessionStorage.setItem(KEY, JSON.stringify(run)); } catch (_) {}
  }
  function clearRun() {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
  }

  function briefById(id) {
    return BRIEFS.filter(function (b) { return b.id === id; })[0] || null;
  }

  // ── rendering ─────────────────────────────────────────────────────────
  function renderPicker() {
    var host = el("brief-list");
    host.textContent = "";
    BRIEFS.forEach(function (b) {
      var card = node("div", "panel takehome-card");
      card.setAttribute("data-testid", "brief-" + b.id);

      var head = node("div", "lab-ex-head");
      var titleWrap = node("div");
      titleWrap.appendChild(node("h3", "m-0", b.title));
      titleWrap.appendChild(node("div", "text-dim text-sm", "From " + b.from + " · suggested " + b.minutes + " minutes"));
      head.appendChild(titleWrap);

      var start = node("button", "btn btn-primary btn-sm", "Start this assignment");
      start.type = "button";
      start.setAttribute("data-start", b.id);
      head.appendChild(start);
      card.appendChild(head);

      card.appendChild(node("p", "text-dim", b.context));
      host.appendChild(card);
    });
  }

  function renderBrief(run) {
    var b = briefById(run.briefId);
    if (!b) { clearRun(); location.reload(); return; }

    el("picker").classList.add("hidden");
    el("assignment").classList.remove("hidden");

    el("assign-title").textContent = b.title;
    el("assign-from").textContent = "From " + b.from;
    el("assign-context").textContent = b.context;

    var scope = el("assign-scope");
    scope.textContent = "";
    b.scope.forEach(function (s) { scope.appendChild(node("li", "", s)); });

    el("assign-deliverable").textContent = b.deliverable;
    el("assign-budget").textContent = b.minutes + " minutes";

    var open = el("open-app");
    open.href = b.url;

    // Report link carries the brief so the builder can be returned to.
    el("open-builder").href = "bug-report-builder.html";

    startClock(run);
    renderProgress(b);
  }

  // ── clock ─────────────────────────────────────────────────────────────
  var clockTimer = null;
  function startClock(run) {
    function tick() {
      var mins = Math.floor((Date.now() - run.startedAt) / 60000);
      var secs = Math.floor(((Date.now() - run.startedAt) % 60000) / 1000);
      var b = briefById(run.briefId);
      el("clock").textContent = mins + "m " + String(secs).padStart(2, "0") + "s";
      el("clock").classList.toggle("over-budget", b && mins >= b.minutes);
      el("clock-note").textContent = (b && mins >= b.minutes)
        ? "Over the suggested budget. Nothing stops — but note it: taking three times the stated time is itself a finding about your estimate."
        : "";
    }
    tick();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tick, 1000);
  }

  // ── live progress: what the app says you have actually triggered ──────
  function foundSoFar(brief) {
    if (!window.Progress) return [];
    return window.Progress.getBugBountyFinds(brief.app) || [];
  }

  function renderProgress(brief) {
    var found = foundSoFar(brief);
    var catalog = (window.APP_DEFECTS && window.APP_DEFECTS[brief.app]) || { defects: [] };
    el("live-found").textContent = found.length + " of " + catalog.defects.length +
      " seeded defects triggered so far";
  }

  // ── submission ────────────────────────────────────────────────────────
  function submit(run) {
    var b = briefById(run.briefId);
    var report = collectReport();

    if (!report.title || !report.steps) {
      showError("A submission needs at least a title and steps to reproduce. That is the minimum a reviewer can act on.");
      return;
    }

    var found = foundSoFar(b);
    var catalog = (window.APP_DEFECTS && window.APP_DEFECTS[b.app]) || { defects: [] };
    var weights = { low: 1, medium: 2, high: 3, critical: 5 };

    var foundHigh = catalog.defects.filter(function (d) {
      return found.indexOf(d.id) !== -1 && (d.severity === "high" || d.severity === "critical");
    });
    var totalWeight = catalog.defects.reduce(function (n, d) { return n + weights[d.severity]; }, 0);
    var foundWeight = catalog.defects.reduce(function (n, d) {
      return found.indexOf(d.id) !== -1 ? n + weights[d.severity] : n;
    }, 0);

    var elapsedMin = Math.round((Date.now() - run.startedAt) / 60000);

    // Objective checks — the ones a machine can judge honestly.
    var checks = [
      { id: "found-critical", pass: foundHigh.length > 0 },
      { id: "severity-sane", pass: !!report.severity && severitySane(report, foundHigh) },
      { id: "repro-steps", pass: /\n|\d\./.test(report.steps) && report.steps.length > 40 },
      { id: "expected-actual", pass: !!report.expected && !!report.actual },
      { id: "recommendation", pass: report.notes.length > 20 }
    ];

    renderResult(b, {
      checks: checks,
      found: found,
      foundHigh: foundHigh,
      coverage: totalWeight ? Math.round(foundWeight / totalWeight * 100) : 0,
      elapsedMin: elapsedMin,
      report: report
    });

    saveArtifact(b, report, checks, elapsedMin);
    clearRun();
  }

  // A money-affecting or security defect reported as low/medium is the
  // calibration error reviewers notice first.
  function severitySane(report, foundHigh) {
    if (!foundHigh.length) return true;
    return report.severity === "S1" || report.severity === "S2" ||
           /critical|high/i.test(report.severity);
  }

  function collectReport() {
    return {
      title: (el("th-title").value || "").trim(),
      severity: (el("th-severity").value || "").trim(),
      steps: (el("th-steps").value || "").trim(),
      expected: (el("th-expected").value || "").trim(),
      actual: (el("th-actual").value || "").trim(),
      notes: (el("th-notes").value || "").trim()
    };
  }

  function showError(msg) {
    var box = el("submit-error");
    box.textContent = msg;
    box.classList.add("visible");
  }

  function renderResult(brief, r) {
    el("assignment").classList.add("hidden");
    var host = el("result");
    host.classList.remove("hidden");
    host.textContent = "";

    var head = node("div", "panel " + (r.checks.filter(function (c) { return c.pass; }).length >= 4 ? "panel-accent" : "panel-warn"));
    head.appendChild(node("h2", "m-0", "Submitted — " + brief.title));
    // "Took 0 minutes" reads as a defect to the exact audience this site has.
    var took = r.elapsedMin < 1 ? "under a minute" : r.elapsedMin + " minutes";
    head.appendChild(node("p", "text-dim",
      "Took " + took + " against a " + brief.minutes + "-minute budget. " +
      "Reached " + r.coverage + "% of the seeded defects by severity weight."));
    host.appendChild(head);

    // Rubric — objective checks first, then the reasoning for each.
    var rubric = node("div", "panel");
    rubric.appendChild(node("h3", "", "How a reviewer would read this"));
    var list = node("ul", "takehome-rubric");
    brief.rubric.forEach(function (item) {
      var check = r.checks.filter(function (c) { return c.id === item.id; })[0];
      var passed = check && check.pass;
      var li = node("li", "takehome-rubric-item " + (passed ? "rubric-pass" : "rubric-miss"));
      li.setAttribute("data-testid", "rubric-" + item.id);
      li.appendChild(node("strong", "", (passed ? "✓ " : "✗ ") + item.label));
      li.appendChild(node("div", "text-dim text-sm", item.why));
      list.appendChild(li);
    });
    rubric.appendChild(list);
    host.appendChild(rubric);

    // What was actually in the app, now that it is over.
    var reveal = node("div", "panel");
    reveal.appendChild(node("h3", "", "What was in the build"));
    var catalog = (window.APP_DEFECTS && window.APP_DEFECTS[brief.app]) || { defects: [] };
    var ul = node("ul", "takehome-reveal");
    catalog.defects.forEach(function (d) {
      var hit = r.found.indexOf(d.id) !== -1;
      var li = node("li", hit ? "found" : "missed");
      li.appendChild(node("span", "tag difficulty-" +
        (d.severity === "critical" || d.severity === "high" ? "hard" : d.severity === "medium" ? "medium" : "easy"),
        d.severity.toUpperCase()));
      li.appendChild(document.createTextNode(" " + d.title));
      li.appendChild(node("span", "text-dim text-sm", hit ? "  — you reached this" : "  — not triggered"));
      ul.appendChild(li);
    });
    reveal.appendChild(ul);
    reveal.appendChild(node("p", "text-dim text-sm",
      "Reaching a defect is not the same as reporting it well, and reporting well is what the rubric above grades. " +
      "A submission that finds three and writes one up clearly beats one that lists eight in a way nobody can act on."));
    host.appendChild(reveal);

    var again = node("button", "btn btn-ghost", "Take another assignment");
    again.type = "button";
    again.setAttribute("data-testid", "takehome-restart");
    again.addEventListener("click", function () { location.href = location.pathname; });
    host.appendChild(again);
  }

  function saveArtifact(brief, report, checks, elapsedMin) {
    if (!window.Progress || !window.Progress.saveArtifact) return;
    var passed = checks.filter(function (c) { return c.pass; }).length;
    window.Progress.saveArtifact({
      type: "take-home",
      title: "Take-home — " + brief.title,
      fields: {
        "th-brief": brief.title,
        "th-title": report.title,
        "th-severity": report.severity,
        "th-steps": report.steps,
        "th-expected": report.expected,
        "th-actual": report.actual,
        "th-notes": report.notes,
        "th-time": elapsedMin + " minutes (budget " + brief.minutes + ")",
        "th-score": passed + "/" + checks.length + " rubric checks"
      }
    });
  }

  // ── wiring ────────────────────────────────────────────────────────────
  if (!BRIEFS.length) return;

  var run = loadRun();
  renderPicker();

  el("brief-list").addEventListener("click", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-start");
    if (!id) return;
    var fresh = { briefId: id, startedAt: Date.now() };
    saveRun(fresh);
    renderBrief(fresh);
  });

  el("submit-assignment").addEventListener("click", function () {
    var active = loadRun();
    if (active) submit(active);
  });

  el("abandon").addEventListener("click", function () {
    if (!confirm("Abandon this assignment? Your timer and draft on this page are lost.")) return;
    clearRun();
    location.href = location.pathname;
  });

  if (run) renderBrief(run);

  // Returning from the practice app should show current progress, not a
  // stale count from when the page first loaded.
  document.addEventListener("visibilitychange", function () {
    var active = loadRun();
    if (!document.hidden && active) renderProgress(briefById(active.briefId));
  });
})();
