/*
 * Bug Bounty side panel.
 *
 * The hunt loop used to require two tabs: break things in the buggy app,
 * switch to the Bug Bounty page to tick what you found, switch back. This
 * mounts the app's own defect checklist as a collapsible drawer inside the
 * app, so a find gets ticked at the moment it happens.
 *
 * Mounts ONLY on pages whose defects exist in the catalog — it matches
 * location against APP_DEFECTS urls, so clean apps and ordinary pages get
 * nothing. The full Bug Bounty page remains the cross-app overview and the
 * place to reveal or clear; the drawer is deliberately just the checklist.
 *
 * Same Progress store as the page, so the two stay in sync by construction:
 * tick in the drawer, and the page's score already knows.
 */
(function () {
  "use strict";

  var OPEN_KEY = "bounty_panel_open";
  var SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 5 };

  function currentAppKey() {
    if (!window.APP_DEFECTS) return null;
    var here = location.pathname.split("/").pop();
    var keys = Object.keys(window.APP_DEFECTS);
    for (var i = 0; i < keys.length; i++) {
      var url = window.APP_DEFECTS[keys[i]].url || "";
      if (url.split("/").pop() === here) return keys[i];
    }
    return null;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function prefix() {
    return (window.SiteChrome && window.SiteChrome.prefix) ? window.SiteChrome.prefix() : "";
  }

  function mount() {
    var key = currentAppKey();
    if (!key || !window.Progress) return;
    var app = window.APP_DEFECTS[key];

    // ---- toggle button ---------------------------------------------------
    var toggle = el("button", "bounty-toggle");
    toggle.type = "button";
    toggle.setAttribute("data-testid", "bounty-toggle");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "bounty-panel");
    var toggleIcon = el("span", "", "🐛");
    toggleIcon.setAttribute("aria-hidden", "true");
    var toggleText = el("span", "bounty-toggle-label", "Bug Bounty");
    var toggleCount = el("span", "bounty-toggle-count");
    toggleCount.setAttribute("data-testid", "bounty-count");
    toggle.append(toggleIcon, toggleText, toggleCount);

    // ---- panel -----------------------------------------------------------
    var panel = el("aside", "bounty-panel");
    panel.id = "bounty-panel";
    panel.setAttribute("data-testid", "bounty-panel");
    panel.setAttribute("aria-label", "Bug Bounty checklist for " + app.name);
    // Non-modal drawer: the app stays usable next to it, which is the point.

    var head = el("div", "bounty-panel-head");
    var title = el("h2", "bounty-panel-title", "Bug Bounty — " + app.name);
    title.tabIndex = -1; // focus target on open
    var close = el("button", "bounty-panel-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close Bug Bounty panel");
    close.setAttribute("data-testid", "bounty-close");
    close.textContent = "×";
    head.append(title, close);

    var scoreLine = el("p", "bounty-score text-dim");
    scoreLine.setAttribute("data-testid", "bounty-score");

    var bar = el("div", "quiz-progress");
    var barFill = el("div", "quiz-progress-bar");
    bar.appendChild(barFill);

    var intro = el("p", "text-dim text-sm",
      "Tick a defect the moment you find it. Titles stay hidden until you do — no spoilers.");

    var list = el("ul", "bounty-list");

    var footer = el("div", "bounty-panel-footer");
    var fullLink = el("a", "btn btn-ghost btn-sm", "Full Bug Bounty page →");
    fullLink.href = prefix() + "pages/bug-bounty.html";
    footer.appendChild(fullLink);

    panel.append(head, scoreLine, bar, intro, list, footer);

    // ---- rendering ---------------------------------------------------------
    function render() {
      var found = new Set(window.Progress.getBugBountyFinds(key));
      var auto = window.Detector ? window.Detector.autoDetected(key) : [];
      var totalW = 0, foundW = 0;
      app.defects.forEach(function (d) {
        var w = SEVERITY_WEIGHT[d.severity];
        totalW += w;
        if (found.has(d.id)) foundW += w;
      });

      toggleCount.textContent = found.size + "/" + app.defects.length;
      scoreLine.textContent =
        found.size + " of " + app.defects.length + " found · " +
        foundW + "/" + totalW + " severity points";
      barFill.style.width = (totalW ? Math.round(foundW / totalW * 100) : 0) + "%";

      list.textContent = "";
      app.defects.forEach(function (d) {
        var isFound = found.has(d.id);
        var li = el("li", "bounty-item" + (isFound ? " found" : ""));

        var label = el("label", "bounty-item-label");
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = isFound;
        box.setAttribute("data-defect", d.id);

        var body = el("div", "flex-1");
        var sev = el("span",
          "tag difficulty-" + (d.severity === "critical" || d.severity === "high" ? "hard" : d.severity === "medium" ? "medium" : "easy"),
          d.severity.toUpperCase());
        var titleText = el("strong", "bounty-item-title",
          isFound ? d.title : "Hidden — tick when you find it");
        var topLine = el("div", "");
        topLine.append(sev, document.createTextNode(" "), titleText);

        // Auto-detected finds are labeled, not hidden among the rest. You
        // still get the credit; the panel is just honest about whether you
        // claimed it or the app handed it to you.
        if (isFound && auto.indexOf(d.id) !== -1) {
          var badge = el("span", "bounty-auto-badge", "AUTO-DETECTED");
          badge.setAttribute("data-testid", "auto-badge");
          badge.title = "You triggered this behavior in the app, so it was revealed for you.";
          topLine.append(document.createTextNode(" "), badge);
        }
        body.appendChild(topLine);

        if (isFound) {
          body.appendChild(el("div", "text-dim text-xs mt-2", "Reproduces via: " + d.hint));
          var writeUp = el("a", "bounty-writeup-link", "Write this up →");
          writeUp.href = prefix() + "pages/bug-report-builder.html?app=" + encodeURIComponent(key) + "&defect=" + encodeURIComponent(d.id);
          writeUp.setAttribute("data-testid", "panel-write-up");
          // Inside a label: without this the label swallows the click and
          // toggles the checkbox instead of navigating. Same bug the full
          // page fixed; same fix.
          writeUp.addEventListener("click", function (e) { e.stopPropagation(); });
          body.appendChild(writeUp);
        }

        label.append(box, body);
        li.appendChild(label);
        list.appendChild(li);
      });
    }

    list.addEventListener("change", function (e) {
      if (!e.target.matches('input[type="checkbox"][data-defect]')) return;
      var existing = new Set(window.Progress.getBugBountyFinds(key));
      if (e.target.checked) existing.add(e.target.getAttribute("data-defect"));
      else existing.delete(e.target.getAttribute("data-defect"));
      window.Progress.setBugBountyFinds(key, Array.from(existing));
      render();
    });

    // ---- open/close --------------------------------------------------------
    function setOpen(open, moveFocus) {
      document.body.classList.toggle("bounty-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch (_) {}
      if (moveFocus) {
        if (open) {
          // The panel animates from visibility:hidden, and focus() into a
          // hidden subtree is silently refused. Two frames guarantees the
          // visibility flip has been computed before focus moves.
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { title.focus(); });
          });
        } else {
          toggle.focus();
        }
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("bounty-open"), true);
    });
    close.addEventListener("click", function () { setOpen(false, true); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("bounty-open")) {
        setOpen(false, true);
      }
    });

    // A defect detected in the app updates the panel immediately, whether it
    // is open or shut — the count on the toggle changes either way, which is
    // the signal that something just happened.
    document.addEventListener("qa:defect-detected", function (e) {
      render();
      announce(e.detail);
    });

    // Announced politely rather than as an alert: it must reach a screen
    // reader without stealing focus from whatever the tester was doing.
    function announce(detail) {
      var live = byIdOrCreate();
      live.textContent = "Defect detected: " + detail.title + " (" + detail.severity + ")";
      toast(detail);
    }

    function byIdOrCreate() {
      var n = document.getElementById("bounty-live");
      if (!n) {
        n = el("div", "sr-only");
        n.id = "bounty-live";
        n.setAttribute("role", "status");
        n.setAttribute("aria-live", "polite");
        document.body.appendChild(n);
      }
      return n;
    }

    function toast(detail) {
      var t = el("div", "bounty-toast");
      t.setAttribute("data-testid", "defect-toast");
      t.appendChild(el("div", "bounty-toast-title", "🐛 Defect detected"));
      t.appendChild(el("div", "bounty-toast-body", detail.title));
      var open = el("button", "btn btn-ghost btn-sm mt-2", "Open Bug Bounty");
      open.type = "button";
      open.addEventListener("click", function () {
        setOpen(true, true);
        t.remove();
      });
      t.appendChild(open);
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.classList.add("visible"); });
      setTimeout(function () {
        t.classList.remove("visible");
        setTimeout(function () { t.remove(); }, 400);
      }, 6000);
    }

    document.body.append(toggle, panel);
    render();

    // A hunt survives reloads — broken apps get refreshed mid-session — so the
    // drawer's open state does too. Session-scoped: a fresh visit starts shut.
    var wasOpen = false;
    try { wasOpen = sessionStorage.getItem(OPEN_KEY) === "1"; } catch (_) {}
    if (wasOpen) setOpen(true, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
