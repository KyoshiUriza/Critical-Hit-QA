/*
 * DevTools Lab.
 *
 * Every effect here is REAL. The console entries are real console entries; the
 * 404 is a real failed request in the Network tab; the storage write is real
 * localStorage. Nothing is a mock-up of DevTools, because a simulated panel
 * would teach the simulation rather than the tool.
 *
 * One constraint shaped the Network challenge. The site's CSP is
 * connect-src 'none' and it makes no fetch/XHR anywhere, so a request cannot
 * be made that way. An <img> pointing at a missing same-origin file is a
 * genuine request that genuinely 404s, appears in the Network tab like any
 * other, and needs no relaxation of the policy.
 *
 * Nothing fires on load. Every effect is behind a button, so the page opens
 * with a clean console — which keeps it honest for the smoke suite that
 * asserts zero console errors sitewide, and is a more realistic exercise
 * anyway: you act, then you go and read.
 */
(function () {
  "use strict";

  var CHALLENGES = window.DEVTOOLS_CHALLENGES || [];
  if (!CHALLENGES.length) return;

  var solved = {};

  function el(id) { return document.getElementById(id); }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ── the four real effects ─────────────────────────────────────────────
  var EFFECTS = {
    console: function () {
      // A real console.error, logged at click time so the page loads clean.
      console.error(
        "DiscountService: coupon SAVE20 expired on 2026-07-31, ignoring. " +
        "Order total unchanged."
      );
      say("coupon-result", "Discount applied — you saved 20%!", "form-success");
    },

    network: function () {
      // A genuine 404: same-origin path that does not exist. Real Network row.
      var img = el("product-image");
      img.hidden = false;
      img.src = "product-9781.png?cache-bust=" + Date.now();
      say("network-result", "Loading product image…", "text-dim");
    },

    storage: function () {
      try {
        localStorage.setItem("devtools_lab_prefs", JSON.stringify({
          newsletter: el("pref-newsletter").checked,
          theme: el("pref-theme").value,
          savedAt: new Date().toISOString()
        }));
      } catch (_) {}
      say("storage-result", "Saved to your account.", "form-success");
    },

    elements: function () {
      var email = el("dl-email").value.trim();
      var err = el("dl-email-error");
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      // The message is written and shown — but the stylesheet renders it at
      // opacity 0, so it is in the DOM and invisible. Deliberate.
      err.textContent = valid ? "" : "Enter a valid email address, for example you@example.com";
      err.hidden = false;
      say("elements-result", valid
        ? "Submitted."
        : "Could not submit. Please check the form.", valid ? "form-success" : "text-dim");
    }
  };

  function say(id, text, cls) {
    var n = el(id);
    if (!n) return;
    n.textContent = text;
    n.className = cls || "";
  }

  // ── grading ───────────────────────────────────────────────────────────
  function check(ch) {
    var input = document.querySelector('[data-answer="' + ch.id + '"]');
    var out = document.querySelector('[data-verdict="' + ch.id + '"]');
    var value = (input.value || "").toLowerCase().replace(/\s+/g, " ").trim();

    if (!value) {
      out.className = "panel panel-warn";
      out.textContent = "Open the " + ch.panel + " panel and read it, then answer.";
      return;
    }

    var hit = ch.expect.every(function (want) {
      return value.indexOf(String(want).toLowerCase()) !== -1;
    });

    out.textContent = "";
    out.className = "panel " + (hit ? "panel-accent" : "panel-warn");
    out.appendChild(node("strong", "", hit ? "✓ That is what the evidence says" : "Not what the panel shows"));
    out.appendChild(node("p", "m-0 text-sm", hit ? ch.teaches : ch.hint));

    if (hit && !solved[ch.id]) {
      solved[ch.id] = true;
      renderScore();
      if (window.Progress && window.Progress.recordQuizRun) {
        // Counts as manual-testing practice: this is investigation, not code.
        window.Progress.recordQuizRun({ category: "manual", correct: 1, total: 1, elapsedMs: 0 });
      }
    }
  }

  function renderScore() {
    var n = Object.keys(solved).length;
    el("dl-score").textContent = n + " of " + CHALLENGES.length + " evidenced";
    el("dl-progress").style.width = Math.round(n / CHALLENGES.length * 100) + "%";
  }

  // ── render ────────────────────────────────────────────────────────────
  var host = el("challenges");
  CHALLENGES.forEach(function (ch) {
    var sec = node("section", "app-frame");
    sec.setAttribute("data-testid", "challenge-" + ch.id);

    var head = node("div", "lab-ex-head");
    var titleWrap = node("div");
    titleWrap.appendChild(node("h2", "m-0", ch.title));
    titleWrap.appendChild(node("div", "text-dim text-sm", ch.open));
    head.appendChild(titleWrap);
    head.appendChild(node("span", "tag", ch.panel));
    sec.appendChild(head);

    sec.appendChild(node("p", "", ch.task));

    // Each challenge's own controls live in the page markup so they can be
    // real form elements rather than generated ones.
    var slot = el("slot-" + ch.id);
    if (slot) {
      slot.hidden = false;
      sec.appendChild(slot);
    }

    var trigger = node("button", "btn btn-primary", ch.action);
    trigger.type = "button";
    trigger.setAttribute("data-trigger", ch.id);
    trigger.addEventListener("click", function () { EFFECTS[ch.id](); });
    sec.appendChild(trigger);

    var field = node("div", "form-field mt-4");
    var label = node("label", "", "What does the " + ch.panel + " panel show?");
    label.setAttribute("for", "answer-" + ch.id);
    var input = document.createElement("input");
    input.type = "text";
    input.id = "answer-" + ch.id;
    input.autocomplete = "off";
    input.setAttribute("data-answer", ch.id);
    field.append(label, input);
    sec.appendChild(field);

    var submit = node("button", "btn btn-ghost btn-sm", "Check my evidence");
    submit.type = "button";
    submit.setAttribute("data-check", ch.id);
    submit.addEventListener("click", function () { check(ch); });
    sec.appendChild(submit);

    var verdict = node("div", "hidden");
    verdict.setAttribute("data-verdict", ch.id);
    sec.appendChild(verdict);

    host.appendChild(sec);
  });

  renderScore();
})();
