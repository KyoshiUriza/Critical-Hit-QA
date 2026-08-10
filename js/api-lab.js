/*
 * API Lab UI: send a request, read the response, work six graded exercises.
 *
 * Everything is built with createElement/textContent. Response bodies contain
 * user-supplied values (the name and email you POST), and a client that renders
 * a server's JSON into innerHTML is a real vulnerability class — one this site
 * would be poorly placed to demonstrate by accident.
 */
(function () {
  "use strict";

  if (!window.MockApi || !window.API_EXERCISES) return;

  var current = 0;

  function el(id) { return document.getElementById(id); }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function send() {
    var method = el("api-method").value;
    var url = el("api-url").value.trim();
    var raw = el("api-body").value.trim();
    var token = el("api-token").checked ? window.MockApi.TOKEN : null;

    var body;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch (err) {
        // A malformed request body is the caller's bug, not the API's — say so
        // rather than letting it surface as a confusing 422.
        showError("Request body is not valid JSON: " + err.message);
        return;
      }
    }

    var started = performance.now();
    var res = window.MockApi.request(method, url, { body: body, token: token });
    var ms = Math.max(1, Math.round(performance.now() - started));

    render(res, ms);
    check(method, url, res);
  }

  function showError(msg) {
    el("api-status").textContent = "—";
    el("api-status").className = "api-status api-status-error";
    el("api-headers").textContent = "";
    el("api-body-out").textContent = msg;
    el("api-verdict").className = "hidden";
  }

  function render(res, ms) {
    var statusEl = el("api-status");
    statusEl.textContent = res.status;
    statusEl.className = "api-status " +
      (res.status < 300 ? "api-status-ok" : res.status < 500 ? "api-status-client" : "api-status-error");

    el("api-time").textContent = ms + " ms";

    var headers = el("api-headers");
    headers.textContent = "";
    Object.keys(res.headers || {}).forEach(function (k) {
      headers.appendChild(node("div", "", k + ": " + res.headers[k]));
    });

    el("api-body-out").textContent = res.body === null
      ? "(no content)"
      : JSON.stringify(res.body, null, 2);
  }

  // ── Exercises ─────────────────────────────────────────────────────────
  function renderExercise() {
    var ex = window.API_EXERCISES[current];
    el("ex-num").textContent = "Exercise " + (current + 1) + " of " + window.API_EXERCISES.length;
    el("ex-task").textContent = ex.task;
    el("ex-hint").textContent = ex.hint;
    el("api-verdict").className = "hidden";
    el("prev-ex").disabled = current === 0;
    el("next-ex").disabled = current === window.API_EXERCISES.length - 1;
  }

  function check(method, url, res) {
    var ex = window.API_EXERCISES[current];
    var verdict = el("api-verdict");
    verdict.textContent = "";

    var passed = false;
    try {
      passed = ex.check(method, url, res);
    } catch (_) {
      passed = false;
    }

    verdict.className = "panel " + (passed ? "panel-accent" : "panel-warn");
    verdict.appendChild(node("strong", "", passed ? "✓ Correct" : "Not yet"));
    verdict.appendChild(node("p", "m-0 text-sm", passed ? ex.teaches : ex.nudge));

    if (passed && window.Progress && window.Progress.recordQuizRun) {
      window.Progress.recordQuizRun({ category: "api", correct: 1, total: 1, elapsedMs: 0 });
    }
  }

  el("api-send").addEventListener("click", send);
  el("api-reset").addEventListener("click", function () {
    window.MockApi.reset();
    el("api-body-out").textContent = "Data reset. Every user and order is back to its seeded state.";
    el("api-status").textContent = "—";
    el("api-status").className = "api-status";
    el("api-verdict").className = "hidden";
  });
  el("prev-ex").addEventListener("click", function () { current--; renderExercise(); });
  el("next-ex").addEventListener("click", function () { current++; renderExercise(); });

  // Preset buttons fill the form rather than sending, so you still choose to
  // send — the exercise is reading the response, not clicking a shortcut.
  Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (b) {
    b.addEventListener("click", function () {
      var p = JSON.parse(b.getAttribute("data-preset"));
      el("api-method").value = p.method;
      el("api-url").value = p.url;
      el("api-body").value = p.body ? JSON.stringify(p.body, null, 2) : "";
      el("api-token").checked = !!p.token;
    });
  });

  renderExercise();
})();
