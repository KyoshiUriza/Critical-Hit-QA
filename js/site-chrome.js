// Single source of truth for the site header and footer.
//
// Why this exists: the header was hand-copied into 25+ HTML files and drifted
// into three different nav sets (9 / 8 / 5 / 2 items depending on the page).
// Every page now declares only where it lives; this module renders the rest.
//
// Usage in a page:
//   <body data-page="progress" data-depth="1">
//     <a class="skip-link" href="#main">Skip to content</a>
//     <div id="site-header"></div>
//     <main id="main" class="container"> … </main>
//     <div id="site-footer"></div>
//     <script src="../js/site-chrome.js"></script>
//
// data-page  — key from NAV below (or any string; unmatched = no active item)
// data-depth — how many directories deep the page is relative to the site root
//              0 = index.html, 1 = pages/*.html, 2 = pages/learn/*.html
(function () {
  "use strict";

  // The canonical nav. Order matters — this is the site's information architecture.
  var NAV = [
    { key: "home",          label: "Home",       href: "index.html" },
    { key: "learn",         label: "Learn",      href: "pages/learn.html" },
    { key: "practice-tests",label: "Quizzes",    href: "pages/practice-tests.html" },
    { key: "practice-apps", label: "Practice Apps", href: "pages/practice-apps.html" },
    { key: "bug-bounty",    label: "Bug Bounty", href: "pages/bug-bounty.html" },
    { key: "portfolio",     label: "Portfolio",  href: "pages/portfolio.html" },
    { key: "automation-lab",label: "Automation", href: "pages/automation-lab.html" },
    { key: "progress",      label: "Progress",   href: "pages/progress.html" },
    { key: "study-plan",    label: "Study Plan", href: "pages/study-plan.html" },
    { key: "resources",     label: "Resources",  href: "pages/resources.html" }
  ];

  // Pages that share a nav highlight with a sibling (e.g. both builders).
  var ACTIVE_ALIAS = {
    "test-case-builder": "portfolio",
    "bug-report-builder": "portfolio",
    "interview-questions": "resources",
    "tester-lattice": "progress",
    "learn-manual": "learn",
    "learn-automation": "learn",
    "learn-codeless": "learn",
    "learn-frameworks": "learn",
    "learn-locators": "learn",
    "learn-sql": "learn",
    "playwright-errors": "automation-lab"
  };

  var DONATE_URL = "https://buymeacoffee.com/kyoshiuriza";
  // No backend, so feedback is a mailto. Subject is prefilled so replies are
  // filterable; body seeds the three things that make feedback actionable.
  var FEEDBACK_URL =
    "mailto:kyoushiuriza@gmail.com" +
    "?subject=" + encodeURIComponent("QA Prep Hub feedback") +
    "&body=" + encodeURIComponent(
      "What page were you on?\n\nWhat did you expect?\n\nWhat happened instead?\n"
    );

  function depth() {
    var d = document.body.getAttribute("data-depth");
    var n = parseInt(d, 10);
    return isNaN(n) ? 0 : n;
  }

  function prefix() {
    var n = depth();
    return n === 0 ? "" : new Array(n + 1).join("../");
  }

  function activeKey() {
    var page = document.body.getAttribute("data-page") || "";
    return ACTIVE_ALIAS[page] || page;
  }

  function buildHeader() {
    var p = prefix();
    var active = activeKey();

    var header = document.createElement("header");
    header.className = "site-header";

    var inner = document.createElement("div");
    inner.className = "container header-inner";

    var brand = document.createElement("a");
    brand.className = "brand";
    brand.href = p + "index.html";
    brand.textContent = "QA Prep Hub";

    // Ten nav items cannot fit on a narrow viewport. Rather than let them wrap
    // out of a fixed-height bar, collapse them behind a toggle.
    var toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "primary-nav");
    toggle.setAttribute("aria-label", "Menu");
    toggle.innerHTML = '<span class="nav-toggle-bars" aria-hidden="true"></span>';

    var nav = document.createElement("nav");
    nav.className = "nav";
    nav.id = "primary-nav";
    nav.setAttribute("aria-label", "Main");

    NAV.forEach(function (item) {
      var a = document.createElement("a");
      a.href = p + item.href;
      a.textContent = item.label;
      if (item.key === active) {
        a.className = "active";
        a.setAttribute("aria-current", "page");
      }
      nav.appendChild(a);
    });

    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Esc closes the menu and returns focus to the toggle.
    header.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });

    inner.appendChild(brand);
    inner.appendChild(toggle);
    inner.appendChild(nav);
    header.appendChild(inner);
    return header;
  }

  function buildFooter() {
    var footer = document.createElement("footer");
    footer.className = "site-footer";

    var container = document.createElement("div");
    container.className = "container";

    var line1 = document.createElement("p");
    line1.appendChild(document.createTextNode("QA Prep Hub — a local study companion. Themed on "));
    var em = document.createElement("em");
    em.textContent = "The Convergence Chronicles: The Resonance Lattice";
    line1.appendChild(em);
    line1.appendChild(document.createTextNode("."));

    var line2 = document.createElement("p");
    line2.style.marginTop = "12px";
    line2.appendChild(document.createTextNode("Found it useful? "));
    var donate = document.createElement("a");
    donate.className = "donation-cta";
    donate.href = DONATE_URL;
    donate.target = "_blank";
    donate.rel = "noopener noreferrer";
    donate.setAttribute("data-testid", "donate-link");
    donate.textContent = "☕ Buy me a coffee";
    line2.appendChild(donate);

    var line3 = document.createElement("p");
    line3.style.marginTop = "8px";
    var feedback = document.createElement("a");
    feedback.href = FEEDBACK_URL;
    feedback.textContent = "Found a bug here or have an idea? Tell me →";
    feedback.setAttribute("data-testid", "feedback-link");
    line3.appendChild(feedback);

    container.appendChild(line1);
    container.appendChild(line2);
    container.appendChild(line3);
    footer.appendChild(container);
    return footer;
  }

  function mount() {
    var headerSlot = document.getElementById("site-header");
    if (headerSlot) headerSlot.replaceWith(buildHeader());

    var footerSlot = document.getElementById("site-footer");
    if (footerSlot) footerSlot.replaceWith(buildFooter());
  }

  // Header must exist before rpg.js tries to mount its chip into it.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  window.SiteChrome = { NAV: NAV, prefix: prefix, mount: mount };
})();
