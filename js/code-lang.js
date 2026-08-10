// Language toggle for Playwright code samples.
//
// The site teaches Playwright in JavaScript by default — it's the lower barrier
// for someone learning automation for the first time, and it matches the
// examples in the Automation Lab. TypeScript is a first-class alternative for
// anyone whose target job asks for it, so every sample ships both.
//
// Markup contract:
//   <div class="code-sample">
//     <pre class="code" data-lang="js">…JavaScript…</pre>
//     <pre class="code" data-lang="ts">…TypeScript…</pre>
//   </div>
//
// A single toggle in the page header switches every sample at once and the
// choice persists, so a reader never has to re-pick it on the next page.
(function () {
  "use strict";

  var KEY = "qaprep_code_lang";
  var VALID = ["js", "ts"];

  function current() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (_) {}
    return VALID.indexOf(v) > -1 ? v : "js";
  }

  function set(lang) {
    if (VALID.indexOf(lang) === -1) return;
    try { localStorage.setItem(KEY, lang); } catch (_) {}
    apply(lang);
    document.dispatchEvent(new CustomEvent("codelangchange", { detail: { lang: lang } }));
  }

  function apply(lang) {
    document.querySelectorAll(".code-sample [data-lang]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang") !== lang;
    });
    document.querySelectorAll(".code-lang-btn").forEach(function (btn) {
      var on = btn.getAttribute("data-set-lang") === lang;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    // Samples that only exist in one language get a note rather than vanishing.
    document.querySelectorAll(".code-sample").forEach(function (wrap) {
      var visible = wrap.querySelector("[data-lang]:not([hidden])");
      var fallback = wrap.querySelector(".code-lang-fallback");
      if (!visible && !fallback) {
        var only = wrap.querySelector("[data-lang]");
        if (only) only.hidden = false;
      }
    });
  }

  // Renders the toggle into any element with data-code-lang-toggle.
  function mountToggles() {
    document.querySelectorAll("[data-code-lang-toggle]").forEach(function (host) {
      if (host.querySelector(".code-lang-btn")) return;

      var group = document.createElement("div");
      group.className = "code-lang-switch";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Code language");

      var label = document.createElement("span");
      label.className = "code-lang-label";
      label.textContent = "Language";
      group.appendChild(label);

      [
        { id: "js", text: "JavaScript" },
        { id: "ts", text: "TypeScript" }
      ].forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "code-lang-btn";
        b.setAttribute("data-set-lang", opt.id);
        b.setAttribute("data-testid", "code-lang-" + opt.id);
        b.setAttribute("aria-pressed", "false");
        b.textContent = opt.text;
        b.addEventListener("click", function () { set(opt.id); });
        group.appendChild(b);
      });

      host.appendChild(group);
    });
  }

  function init() {
    mountToggles();
    apply(current());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.CodeLang = { get: current, set: set, apply: apply, mount: init };
})();
