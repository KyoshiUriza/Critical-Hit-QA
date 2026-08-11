/*
 * Strict validator for any progress blob arriving from outside this tab.
 *
 * Two things feed it: the JSON file import on the Progress page, and sync
 * codes pasted on the Account page. Both are attacker-suppliable — a sync code
 * is a string someone can hand you — so neither may write to storage without
 * passing through here first.
 *
 * It rebuilds the object field by field rather than patching the input. That
 * means anything unrecognised is dropped instead of merely unvalidated, which
 * is the difference between a whitelist and a wish.
 */
(function () {
  "use strict";

  var ALLOWED_CATEGORIES = ["fundamentals", "manual", "automation", "api", "agile", "performance", "sql", "ai"];
  var ALLOWED_PLANS = ["3-day", "1-week", "1-month"];
  // "code-review" is the Code Review Gauntlet's written verdict. It exists
  // because a QA lead's review made the point plainly: the Gauntlet simulates
  // an interview round they actually run, and produced nothing a candidate
  // could show afterwards.
  // "take-home" is a submitted assignment from the Take-Home Simulator. It is
  // the artifact closest to what an employer actually saw, so it belongs in
  // the portfolio alongside the rest.
  var ALLOWED_ARTIFACT_TYPES = ["bug-report", "test-case", "code-review", "take-home"];

  // Caps exist so a hostile code cannot fill the origin's storage quota and
  // wedge the site for the person who pasted it.
  var MAX_ARTIFACTS = 100;
  var MAX_FIELD_CHARS = 8000;
  var MAX_FIELDS = 40;
  var MAX_TITLE_CHARS = 200;

  function has(list, v) {
    return list.indexOf(v) !== -1;
  }

  function int(v, fallback) {
    return typeof v === "number" && isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;
  }

  function isDate(v) {
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  }

  function str(v, max) {
    return typeof v === "string" ? v.slice(0, max) : "";
  }

  function sanitizeArtifacts(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < MAX_ARTIFACTS; i++) {
      var a = raw[i];
      if (!a || typeof a !== "object") continue;
      if (!has(ALLOWED_ARTIFACT_TYPES, a.type)) continue;

      // Field values are user prose that gets rendered back into the page and
      // into exported Markdown. Keys are restricted so a crafted code cannot
      // introduce __proto__ or similar.
      var fields = {};
      if (a.fields && typeof a.fields === "object" && !Array.isArray(a.fields)) {
        var keys = Object.keys(a.fields).slice(0, MAX_FIELDS);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) continue;
          if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
          fields[key] = str(a.fields[key], MAX_FIELD_CHARS);
        }
      }

      out.push({
        id: /^[a-z0-9]{1,32}$/.test(a.id) ? a.id : "a" + Math.random().toString(36).slice(2, 10),
        type: a.type,
        title: str(a.title, MAX_TITLE_CHARS) || "(untitled)",
        fields: fields,
        createdAt: int(a.createdAt, 0),
        updatedAt: int(a.updatedAt, 0)
      });
    }
    return out;
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("root must be an object");
    }
    var out = {};

    // ---- Quiz ----
    var q = raw.quiz && typeof raw.quiz === "object" ? raw.quiz : {};
    out.quiz = { runs: [], byCategory: {} };
    if (Array.isArray(q.runs)) {
      out.quiz.runs = q.runs.slice(0, 50).map(function (r) {
        return {
          category: has(ALLOWED_CATEGORIES, r && r.category) ? r.category : "unknown",
          correct: int(r && r.correct, 0),
          total: int(r && r.total, 0),
          elapsedMs: int(r && r.elapsedMs, 0),
          at: isDate(r && r.at) ? r.at : ""
        };
      }).filter(function (r) { return r.total > 0; });
    }
    if (q.byCategory && typeof q.byCategory === "object") {
      Object.keys(q.byCategory).forEach(function (cat) {
        if (!has(ALLOWED_CATEGORIES, cat)) return;
        var c = q.byCategory[cat];
        if (!c || typeof c !== "object") return;
        out.quiz.byCategory[cat] = {
          attempted: int(c.attempted, 0),
          correct: int(c.correct, 0),
          runs: int(c.runs, 0)
        };
      });
    }

    // ---- Bug bounty ----
    // Defect ids are checked against the real catalog, so an imported blob
    // cannot claim finds that do not exist and inflate the dashboard.
    out.bugBounty = {};
    var catalog = window.APP_DEFECTS || {};
    if (raw.bugBounty && typeof raw.bugBounty === "object") {
      Object.keys(raw.bugBounty).forEach(function (appKey) {
        if (!Object.prototype.hasOwnProperty.call(catalog, appKey)) return;
        var ids = raw.bugBounty[appKey];
        if (!Array.isArray(ids)) return;
        var valid = (catalog[appKey].defects || []).map(function (d) { return d.id; });
        out.bugBounty[appKey] = ids.filter(function (id) {
          return typeof id === "string" && has(valid, id);
        });
      });
    }

    // ---- Study plan ----
    out.studyPlan = {};
    if (raw.studyPlan && typeof raw.studyPlan === "object") {
      Object.keys(raw.studyPlan).forEach(function (plan) {
        if (!has(ALLOWED_PLANS, plan)) return;
        var days = raw.studyPlan[plan];
        if (!days || typeof days !== "object") return;
        var cleaned = {};
        Object.keys(days).forEach(function (d) {
          var idx = parseInt(d, 10);
          if (isFinite(idx) && idx >= 0 && idx < 32 && typeof days[d] === "boolean") cleaned[idx] = days[d];
        });
        out.studyPlan[plan] = cleaned;
      });
    }

    // ---- Artifacts ----
    // The previous validator omitted these entirely, so importing a file
    // silently deleted every saved draft. They are the most valuable thing in
    // the store — the whole point of the portfolio.
    out.artifacts = sanitizeArtifacts(raw.artifacts);

    // ---- Counters ----
    // Derived from artifacts rather than trusted, so the dashboard cannot
    // disagree with what is actually stored.
    out.bugReports = out.artifacts.filter(function (a) { return a.type === "bug-report"; }).length
      || int(raw.bugReports, 0);
    out.testCases = out.artifacts.filter(function (a) { return a.type === "test-case"; }).length
      || int(raw.testCases, 0);

    // ---- Streak ----
    out.streak = { lastDate: null, days: 0 };
    if (raw.streak && typeof raw.streak === "object") {
      if (isDate(raw.streak.lastDate)) out.streak.lastDate = raw.streak.lastDate;
      out.streak.days = int(raw.streak.days, 0);
    }

    return out;
  }

  window.ProgressSchema = {
    sanitize: sanitize,
    ALLOWED_CATEGORIES: ALLOWED_CATEGORIES,
    MAX_ARTIFACTS: MAX_ARTIFACTS
  };
})();
