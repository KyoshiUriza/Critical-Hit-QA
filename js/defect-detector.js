/*
 * Defect detection for the buggy practice apps.
 *
 * The problem this solves: you find a bug, and then you have to guess which
 * hidden row on the checklist it corresponds to. That guessing is not testing
 * — it is a matching puzzle bolted onto the exercise, and it punishes people
 * for finding something the catalogue words differently.
 *
 * So a buggy app calls Detector.trigger(defectId) at the exact line where its
 * defective behaviour happens. The Bug Bounty panel then reveals that row and
 * marks it AUTO-DETECTED.
 *
 * The honesty question this raises, and how it is answered:
 *
 *   Triggering a defect is not the same as noticing it. Someone could set a
 *   quantity, never look at the total, and be credited with finding a tax bug.
 *   So a detected defect is revealed and counted, but it is LABELLED as
 *   auto-detected and kept visually distinct from one you ticked yourself.
 *   The score stays honest because the panel — and the Bug Bounty page — can
 *   both say which finds you claimed and which the app handed you.
 *
 * Detection is deliberately one-way: it never un-ticks. Clearing is a manual
 * act on the Bug Bounty page.
 */
(function () {
  "use strict";

  var AUTO_KEY_PREFIX = "qaprep_auto_";

  function appKey() {
    if (!window.APP_DEFECTS) return null;
    var here = location.pathname.split("/").pop();
    var keys = Object.keys(window.APP_DEFECTS);
    for (var i = 0; i < keys.length; i++) {
      var url = window.APP_DEFECTS[keys[i]].url || "";
      if (url.split("/").pop() === here) return keys[i];
    }
    return null;
  }

  // Which finds arrived by detection rather than by the user ticking. Kept
  // per app so the panel can badge them, and in sessionStorage so a reload
  // mid-hunt does not relabel honest work as auto-detected or vice versa.
  function autoSet(key) {
    try {
      var raw = sessionStorage.getItem(AUTO_KEY_PREFIX + key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function rememberAuto(key, defectId) {
    var list = autoSet(key);
    if (list.indexOf(defectId) === -1) list.push(defectId);
    try {
      sessionStorage.setItem(AUTO_KEY_PREFIX + key, JSON.stringify(list));
    } catch (_) {}
  }

  var Detector = {
    /**
     * Called by a buggy app when its defective behaviour actually occurs.
     * Safe to call repeatedly — a defect triggered fifty times is still one
     * find, and the event only fires the first time so the toast does not
     * become noise.
     */
    trigger: function (defectId) {
      var key = appKey();
      if (!key || !window.Progress || !defectId) return false;

      var app = window.APP_DEFECTS[key];
      var known = (app.defects || []).some(function (d) { return d.id === defectId; });
      if (!known) return false;   // never invent a find for an unknown id

      var found = window.Progress.getBugBountyFinds(key) || [];
      if (found.indexOf(defectId) !== -1) return false;  // already recorded

      window.Progress.setBugBountyFinds(key, found.concat([defectId]));
      rememberAuto(key, defectId);

      var defect = (app.defects || []).filter(function (d) { return d.id === defectId; })[0];
      document.dispatchEvent(new CustomEvent("qa:defect-detected", {
        detail: { app: key, id: defectId, title: defect.title, severity: defect.severity }
      }));
      return true;
    },

    /** Ids for this app that were auto-detected rather than user-ticked. */
    autoDetected: function (key) {
      return autoSet(key || appKey() || "");
    },

    appKey: appKey
  };

  window.Detector = Detector;
})();
