// Test-support hooks. Safe to ship: it only ever clears this site's own
// client-side state, and only when explicitly asked via URL or console.
//
// Why this exists: every E2E spec previously had to hand-roll
// `addInitScript(() => localStorage.clear())`, and each practice app kept its
// own bespoke reset (login has a "Reset lockout" button, others have nothing).
// One primitive is easier to teach and harder to get wrong.
//
//   /practice-apps/login.html?reset      -> clear everything, then load
//   window.__qa.reset()                  -> same, from the console or a spec
//   window.__qa.seed({...})              -> write a progress snapshot directly
(function () {
  "use strict";

  var PROGRESS_KEY = "qaprep_progress_v1";

  // Every key this site owns. Kept explicit so a reset never touches
  // storage belonging to something else on the same origin.
  var OWNED_KEYS = [
    PROGRESS_KEY,
    "qaprep_rpg_seen",
    "remembered_email",
    "remembered_pw",      // only ever written by the intentionally-broken login
    "practice_todos",
    "practice_todos_broken"
  ];
  var OWNED_SESSION_KEYS = ["login_fails", "login_locked"];

  function reset() {
    OWNED_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (_) {}
    });
    OWNED_SESSION_KEYS.forEach(function (k) {
      try { sessionStorage.removeItem(k); } catch (_) {}
    });
  }

  function seed(progress) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (_) {}
  }

  function snapshot() {
    var out = {};
    OWNED_KEYS.forEach(function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (_) {}
      if (v !== null) out[k] = v;
    });
    return out;
  }

  window.__qa = { reset: reset, seed: seed, snapshot: snapshot, keys: OWNED_KEYS };

  // Run before any page module reads storage.
  try {
    var params = new URLSearchParams(location.search);
    if (params.has("reset")) reset();
  } catch (_) {}
})();
