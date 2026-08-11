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
    { key: "resources",     label: "Resources",  href: "pages/resources.html" },
    { key: "account",       label: "Profile",    href: "pages/account.html" }
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
    "learn-setup": "learn",
    "learn-a11y": "learn",
    "learn-responsive": "learn",
    "learn-sql": "learn",
    "playwright-errors": "automation-lab",
    // Deliberately NOT a 12th nav item. The header needs 1200px for 11 items
    // and collapses at 1250 — a new item costs ~80px and would put the row
    // back over its own breakpoint. Reached from Automation Lab, the Learn
    // track, and Playwright Errors instead.
    "code-review": "automation-lab",
    "take-home": "bug-bounty",
    "severity-drill": "bug-bounty"
  };

  var AUTHOR = "Kyoshi Uriza";
  // Hard-coded rather than derived from the clock. A footer that silently
  // reads "© 2027" on New Year's Day is claiming a copyright date for work
  // that has not happened yet, and nobody notices until someone checks.
  var COPYRIGHT_YEAR = "2026";

  var DONATE_URL = "https://buymeacoffee.com/kyoshiuriza";
  var REPO_URL = "https://github.com/KyoshiUriza/Critical-Hit-QA";
  // The serial this site's Lattice vocabulary comes from. Linked because the
  // theme is not decoration — it is the reason the progression system exists,
  // and a reader who wants the source should not have to go looking.
  var BOOK_URL =
    "https://www.royalroad.com/fiction/159344/the-resonance-lattice-book-1-integration";
  // Feedback goes to GitHub Issues rather than a mailto. On a public project
  // that is strictly better: reports are visible and trackable instead of
  // landing in one inbox, and there is no address for scrapers to harvest.
  // The template seeds the three things that make a report actionable — the
  // same discipline this site spends its Bug Report Builder teaching.
  var FEEDBACK_URL =
    REPO_URL + "/issues/new" +
    "?title=" + encodeURIComponent("Feedback: ") +
    "&body=" + encodeURIComponent(
      "**Which page?**\n\n\n**What did you expect?**\n\n\n**What happened instead?**\n\n"
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
    brand.textContent = "Critical Hit QA";

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
    line1.appendChild(document.createTextNode("Critical Hit QA — a free study companion. Themed on "));
    // The title itself is the link rather than a separate "read it here" —
    // the sentence already names the thing being linked, so a second one
    // would just be footer clutter.
    var book = document.createElement("a");
    book.href = BOOK_URL;
    book.target = "_blank";
    book.rel = "noopener noreferrer";
    book.setAttribute("data-testid", "book-link");
    var em = document.createElement("em");
    em.textContent = "The Convergence Chronicles: The Resonance Lattice";
    book.appendChild(em);
    line1.appendChild(book);
    line1.appendChild(document.createTextNode(" on Royal Road."));

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
    feedback.target = "_blank";
    feedback.rel = "noopener noreferrer";
    feedback.textContent = "Found a bug here or have an idea? Open an issue →";
    feedback.setAttribute("data-testid", "feedback-link");
    line3.appendChild(feedback);

    // The source is readable, which for anyone evaluating the author is a
    // stronger signal than the site itself. "Source on GitHub" rather than
    // "open source" — the repo is source-available under an all-rights-reserved
    // licence, and claiming otherwise would be inaccurate.
    line3.appendChild(document.createTextNode("  ·  "));
    var source = document.createElement("a");
    source.href = REPO_URL;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "Source on GitHub";
    source.setAttribute("data-testid", "source-link");
    line3.appendChild(source);

    var line4 = document.createElement("p");
    line4.className = "text-dim";
    line4.style.marginTop = "12px";
    line4.style.fontSize = "var(--fs-xs)";
    line4.setAttribute("data-testid", "copyright");
    line4.textContent = "© " + COPYRIGHT_YEAR + " " + AUTHOR + ". All rights reserved.";

    container.appendChild(line1);
    container.appendChild(line2);
    container.appendChild(line3);
    container.appendChild(line4);
    footer.appendChild(container);
    return footer;
  }

  // Favicons live here rather than in 35 hand-written <head> blocks, for the
  // same reason the header does: duplicated markup drifts. Injecting from JS
  // costs a few ms before the tab icon appears, which is a fair trade for one
  // source of truth. Paths are depth-derived, so they resolve on a project
  // subpath like /Critical-Hit-QA/ too.
  function mountFavicons() {
    if (document.querySelector('link[rel="icon"]')) return;
    var p = prefix();
    var head = document.head;

    function link(rel, href, type, sizes) {
      var l = document.createElement("link");
      l.rel = rel;
      l.href = p + href;
      if (type) l.type = type;
      if (sizes) l.setAttribute("sizes", sizes);
      head.appendChild(l);
    }

    // SVG first — modern browsers prefer it and it stays sharp at any density.
    link("icon", "favicon.svg", "image/svg+xml");
    // Raster fallbacks for browsers that ignore SVG icons.
    link("icon", "favicon-32.png", "image/png", "32x32");
    link("icon", "favicon-16.png", "image/png", "16x16");
    link("apple-touch-icon", "apple-touch-icon.png", null, "180x180");
  }

  function mount() {
    mountFavicons();

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
