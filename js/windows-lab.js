/*
 * Windows, Tabs & Navigation lab.
 *
 * The lab is a TARGET, not a quiz. It cannot see the learner's Playwright
 * script, so it does not pretend to grade one. What it does is provide real
 * behavior — real new tabs, a real popup, a real redirect, a real History
 * push — record which of them have actually been triggered, and reveal the
 * pattern only after the learner has met the problem.
 *
 * Everything is same-origin. The CSP forbids framing and network calls, and
 * none of that is needed: every trap in this category reproduces perfectly
 * against your own pages.
 */
(function () {
  "use strict";

  var CH = window.WINDOW_CHALLENGES || [];
  var triggered = {};
  var opened = [];   // popups this page owns, so Reset can clean up

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function tid(n, id) { n.setAttribute("data-testid", id); return n; }
  function byId(id) { return document.getElementById(id); }

  function target(params) {
    var q = Object.keys(params || {}).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    }).join("&");
    return "window-target.html" + (q ? "?" + q : "");
  }

  function log(message) {
    var box = byId("event-log");
    var row = el("div", "text-dim text-sm");
    row.setAttribute("data-testid", "log-entry");
    // No timestamp: this log is asserted against, and a clock in the text
    // would make every assertion on it nondeterministic.
    row.textContent = "› " + message;
    box.insertBefore(row, box.firstChild);
  }

  function markTriggered(id) {
    if (triggered[id]) return;
    triggered[id] = true;
    var card = document.querySelector('[data-challenge="' + id + '"]');
    if (card) {
      card.setAttribute("data-triggered", "true");
      var reveal = card.querySelector("[data-reveal]");
      if (reveal) reveal.disabled = false;
    }
    updateScore();
  }

  function updateScore() {
    var n = Object.keys(triggered).length;
    byId("wl-score").textContent = n + " of " + CH.length + " exercised";
    byId("wl-progress").style.width = Math.round((n / CH.length) * 100) + "%";

    if (n === CH.length && window.Progress && window.Progress.recordQuizRun) {
      if (!updateScore.recorded) {
        updateScore.recorded = true;
        window.Progress.recordQuizRun({
          category: "automation", correct: n, total: CH.length, elapsedMs: 0
        });
      }
    }
  }

  // ── The behaviors ───────────────────────────────────────────────────
  var ACTIONS = {
    "blank-link": function (host) {
      var a = el("a", "btn btn-primary btn-sm", "Open the target in a new tab");
      a.href = target({ from: "blank-link" });
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      tid(a, "open-blank");
      a.addEventListener("click", function () {
        markTriggered("blank-link");
        log("target=\"_blank\" link clicked — a new tab was opened by the browser");
      });
      host.appendChild(a);
    },

    "window-open": function (host) {
      var b = el("button", "btn btn-primary btn-sm", "Open a popup window");
      b.type = "button";
      tid(b, "open-popup");
      b.addEventListener("click", function () {
        var w = window.open(target({ from: "popup" }), "wl_popup",
          "width=520,height=420");
        if (w) opened.push(w);
        markTriggered("window-open");
        log(w ? "window.open() returned a window handle" : "window.open() was blocked");
      });
      host.appendChild(b);
    },

    "opener-access": function (host) {
      // Buttons, not anchors. An anchor cannot demonstrate this any more:
      // current browsers imply noopener for target="_blank", so both halves
      // of the old link-based version reported "opener: null" and the
      // exercise proved nothing. window.open() is where the difference is.
      function opener(label, feats, testid, cls) {
        var b = el("button", "btn " + cls + " btn-sm", label);
        b.type = "button";
        tid(b, testid);
        b.addEventListener("click", function () {
          var w = window.open(target({ from: testid === "open-safe" ? "safe" : "unsafe" }),
            "_blank", feats);
          if (w) opened.push(w);
          markTriggered("opener-access");
          log("window.open(…, " + (feats ? "'" + feats + "'" : "no features") + ")");
        });
        host.appendChild(b);
      }
      opener("window.open() — no noopener", "", "open-unsafe", "btn-danger");
      opener("window.open() — with noopener", "noopener", "open-safe", "btn-primary");
    },

    "same-tab": function (host) {
      var b = el("button", "btn btn-primary btn-sm", "Navigate this tab");
      b.type = "button";
      tid(b, "go-same-tab");
      b.addEventListener("click", function () {
        markTriggered("same-tab");
        window.location.href = target({ from: "same-tab" });
      });
      host.appendChild(b);
    },

    redirect: function (host) {
      var b = el("button", "btn btn-primary btn-sm", "Follow a redirect");
      b.type = "button";
      tid(b, "go-redirect");
      b.addEventListener("click", function () {
        markTriggered("redirect");
        window.location.href = "window-redirect.html?go=1";
      });
      host.appendChild(b);
    },

    pushstate: function (host) {
      var b = el("button", "btn btn-primary btn-sm", "Change the URL without navigating");
      b.type = "button";
      tid(b, "push-state");
      var step = 1;
      b.addEventListener("click", function () {
        step += 1;
        // A real History push: the address bar moves, no document loads.
        history.pushState({ step: step }, "", "?step=" + step);
        byId("spa-view").textContent = "Step " + step;
        markTriggered("pushstate");
        log("history.pushState → ?step=" + step + " (no navigation occurred)");
      });

      var view = el("div", "app-banner");
      view.setAttribute("data-kind", "info");
      var label = tid(el("strong", null, "Step 1"), "spa-view");
      label.id = "spa-view";   // read back by byId() on reset and deep-link
      view.appendChild(label);
      host.append(b, view);

      window.addEventListener("popstate", function (e) {
        var s = (e.state && e.state.step) || 1;
        byId("spa-view").textContent = "Step " + s;
        log("popstate → Step " + s);
      });
    },

    "three-tabs": function (host) {
      var b = el("button", "btn btn-primary btn-sm", "Open three product tabs");
      b.type = "button";
      tid(b, "open-three");
      b.addEventListener("click", function () {
        ["widget", "gadget", "gizmo"].forEach(function (sku) {
          var w = window.open(target({ from: "three", sku: sku }), "_blank");
          if (w) opened.push(w);
        });
        markTriggered("three-tabs");
        log("opened three tabs: widget, gadget, gizmo");
      });
      host.appendChild(b);
    },

    "self-closing": function (host) {
      var b = el("button", "btn btn-primary btn-sm", "Open a tab that closes itself");
      b.type = "button";
      tid(b, "open-self-closing");
      b.addEventListener("click", function () {
        var w = window.open(target({ from: "self-closing", close: "1200" }), "_blank");
        if (w) opened.push(w);
        markTriggered("self-closing");
        log("opened a tab that will close itself after 1.2s");
      });
      host.appendChild(b);
    }
  };

  // ── Rendering ───────────────────────────────────────────────────────
  function card(c) {
    var wrap = el("section", "panel");
    wrap.setAttribute("data-challenge", c.id);
    tid(wrap, "challenge-" + c.id);

    var head = el("div", "lab-ex-head");
    head.appendChild(el("h3", "m-0", c.title));
    wrap.appendChild(head);

    wrap.appendChild(el("p", null, c.task));

    var trap = el("div", "app-banner");
    trap.setAttribute("data-kind", "warn");
    trap.appendChild(el("span", null, c.trap));
    wrap.appendChild(trap);

    var controls = el("div", "flex gap-2");
    controls.style.flexWrap = "wrap";
    controls.style.margin = "var(--sp-3) 0";
    ACTIONS[c.id](controls);
    wrap.appendChild(controls);

    var reveal = el("button", "btn btn-ghost btn-sm", "Show the Playwright pattern");
    reveal.type = "button";
    reveal.disabled = true;
    reveal.setAttribute("data-reveal", c.id);
    tid(reveal, "reveal-" + c.id);

    var answer = el("div", "hidden");
    tid(answer, "pattern-" + c.id);
    var pre = el("pre", "code-block");
    pre.appendChild(el("code", null, c.pattern));
    answer.appendChild(pre);
    var why = el("p", "text-dim text-sm", c.teaches);
    answer.appendChild(why);

    reveal.addEventListener("click", function () {
      answer.classList.toggle("hidden");
      reveal.textContent = answer.classList.contains("hidden")
        ? "Show the Playwright pattern" : "Hide the pattern";
    });

    wrap.append(reveal, answer);
    return wrap;
  }

  function init() {
    var host = byId("challenges");
    CH.forEach(function (c) { host.appendChild(card(c)); });

    // Deep-linked step, so a reload after pushState is not confusing.
    var step = new URLSearchParams(location.search).get("step");
    if (step) byId("spa-view").textContent = "Step " + step;

    byId("wl-reset").addEventListener("click", function () {
      opened.forEach(function (w) { try { w.close(); } catch (_) {} });
      opened = [];
      history.replaceState({ step: 1 }, "", location.pathname);
      byId("spa-view").textContent = "Step 1";
      byId("event-log").textContent = "";
      log("reset — popups closed and the URL put back");
    });

    updateScore();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
