/*
 * App Shell — product chrome for the practice apps.
 *
 * Each practice app declares which product it is pretending to be, and this
 * builds the header, breadcrumbs, cart badge and account menu around it. The
 * point is not decoration: most defects a tester meets at work are in the
 * chrome and the flow around a form, not in the four inputs at the middle of
 * it, and an app with no chrome cannot contain them.
 *
 * Contract with the rest of the site:
 * - This only ADDS elements. It never touches, renames or removes anything
 *   already in the page, because the suite and any learner's own tests are
 *   written against those selectors.
 * - Everything it injects carries a data-testid, same as the rest of the
 *   apps, so the chrome is as automatable as the widgets.
 * - Built with createElement/textContent. Product names and prices are data,
 *   and interpolating data into innerHTML on a site that teaches testing is
 *   the sort of thing a learner should be able to catch us doing.
 */
(function () {
  "use strict";

  var BRANDS = {
    northwind: {
      name: "Northwind Outfitters",
      mark: "NW",
      accent: "#2f7d5a",
      onAccent: "#ffffff",
      strip: "Free delivery on orders over $50 · 30-day returns",
      stripRight: "Need help? 1-800-000-0000",
      nav: ["Shop", "Deals", "Gear guides", "Orders"]
    },
    tasklane: {
      name: "Tasklane",
      mark: "TL",
      accent: "#5b5bd6",
      onAccent: "#ffffff",
      strip: "Free plan · 3 boards · unlimited tasks",
      stripRight: "Upgrade to Team",
      nav: ["Boards", "My tasks", "Reports", "Settings"]
    },
    meridian: {
      name: "Meridian Bank",
      mark: "MB",
      accent: "#1f5f9e",
      onAccent: "#ffffff",
      strip: "Secure session · we will never ask for your password by email",
      stripRight: "Sign out in 14:59",
      nav: ["Accounts", "Payments", "Statements", "Support"]
    }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function testid(node, id) { node.setAttribute("data-testid", id); return node; }

  function buildStrip(brand) {
    var strip = el("div", "app-strip");
    testid(strip, "app-strip");
    strip.append(el("span", null, brand.strip), el("span", null, brand.stripRight));
    return strip;
  }

  function buildTopbar(shell, brand) {
    var bar = el("div", "app-topbar");
    testid(bar, "app-topbar");

    var brandEl = el("a", "app-brand");
    brandEl.href = "#main";
    testid(brandEl, "app-brand");
    var mark = el("span", "app-brand-mark", brand.mark);
    mark.setAttribute("aria-hidden", "true");
    brandEl.append(mark, el("span", null, brand.name));
    bar.appendChild(brandEl);

    var minimal = shell.getAttribute("data-chrome") === "minimal";
    var items = (shell.getAttribute("data-nav") || "").trim();
    var navItems = minimal ? [] : (items ? items.split("|") : brand.nav);
    var active = shell.getAttribute("data-nav-active") || navItems[0];

    var nav = el("nav", "app-nav");
    nav.setAttribute("aria-label", brand.name + " sections");
    testid(nav, "app-nav");
    navItems.forEach(function (label) {
      var a = el("a", null, label);
      a.href = "#main";
      // Nav that goes nowhere is honest here: these are one-page apps and a
      // link that silently does nothing would itself be a defect. Marked so
      // a learner inspecting it can see it is deliberate.
      a.setAttribute("data-inert-nav", "true");
      if (label === active) a.setAttribute("aria-current", "page");
      testid(a, "app-nav-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      nav.appendChild(a);
    });
    bar.appendChild(nav);

    var actions = el("div", "app-actions");

    if (shell.hasAttribute("data-search")) {
      var search = el("div", "app-search");
      var input = document.createElement("input");
      input.type = "search";
      input.placeholder = shell.getAttribute("data-search") || "Search";
      input.setAttribute("aria-label", shell.getAttribute("data-search") || "Search");
      testid(input, "app-search");
      search.appendChild(input);
      actions.appendChild(search);
    }

    if (shell.hasAttribute("data-cart")) {
      var cartBtn = el("button", "app-icon-btn");
      cartBtn.type = "button";
      cartBtn.setAttribute("aria-label", "Basket");
      testid(cartBtn, "app-cart-button");
      cartBtn.appendChild(el("span", null, "▣"));
      var count = el("span", "app-count", "0");
      count.setAttribute("data-count", "0");
      testid(count, "app-cart-count");
      cartBtn.appendChild(count);
      actions.appendChild(cartBtn);
    }

    var who = shell.getAttribute("data-user");
    if (who) {
      var avatar = el("span", "app-avatar", who.slice(0, 2).toUpperCase());
      avatar.setAttribute("title", who);
      testid(avatar, "app-avatar");
      actions.appendChild(avatar);
    }

    var help = shell.getAttribute("data-help");
    if (help) {
      var parts = help.split("|");
      var a = el("a", null, parts[0]);
      a.href = parts[1] || "#main";
      if (!parts[1]) a.setAttribute("data-inert-nav", "true");
      a.className = "text-sm";
      testid(a, "app-help-link");
      actions.appendChild(a);
    }

    bar.appendChild(actions);
    return bar;
  }

  function buildCrumbs(shell) {
    var raw = shell.getAttribute("data-crumbs");
    if (!raw) return null;
    var wrap = el("nav", "app-crumbs");
    wrap.setAttribute("aria-label", "Breadcrumb");
    testid(wrap, "app-crumbs");
    var ol = document.createElement("ol");
    raw.split("|").forEach(function (label, i, all) {
      var li = document.createElement("li");
      if (i === all.length - 1) {
        var cur = el("span", null, label);
        cur.setAttribute("aria-current", "page");
        li.appendChild(cur);
      } else {
        var a = el("a", null, label);
        a.href = "#main";
        a.setAttribute("data-inert-nav", "true");
        li.appendChild(a);
      }
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    return wrap;
  }

  function mount(shell) {
    var brand = BRANDS[shell.getAttribute("data-brand")] || BRANDS.northwind;
    shell.style.setProperty("--app-accent", brand.accent);
    shell.style.setProperty("--app-on-accent", brand.onAccent);

    var crumbs = buildCrumbs(shell);
    var first = shell.firstChild;
    if (crumbs) shell.insertBefore(crumbs, first);
    shell.insertBefore(buildTopbar(shell, brand), shell.firstChild);
    shell.insertBefore(buildStrip(brand), shell.firstChild);
  }

  var toastTimer = null;

  var AppShell = {
    BRANDS: BRANDS,

    /* A transient confirmation, the way a real product acknowledges an
       action. Announced politely so it is not only a visual event. */
    toast: function (message, kind) {
      var existing = document.querySelector(".app-toast");
      if (existing) existing.remove();
      if (toastTimer) clearTimeout(toastTimer);

      var t = el("div", "app-toast", message);
      t.setAttribute("data-kind", kind || "info");
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      testid(t, "app-toast");
      document.body.appendChild(t);
      toastTimer = setTimeout(function () { t.remove(); }, 4000);
      return t;
    },

    setCartCount: function (n) {
      var badge = document.querySelector('[data-testid="app-cart-count"]');
      if (!badge) return;
      badge.textContent = String(n);
      badge.setAttribute("data-count", String(n));
    },

    /* Inline SVG product imagery. The CSP allows no external images, and a
       deterministic shape per product id is better for testing than a photo
       anyway — it never changes and it never fails to load. */
    productArt: function (seed, label) {
      var hues = [/* teal */ 168, /* blue */ 212, /* violet */ 262, /* amber */ 38, /* rose */ 344];
      var n = 0;
      for (var i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
      var h = hues[n % hues.length];
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 120 90");
      svg.setAttribute("class", "prod-media");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", label ? label + " (illustration)" : "Product illustration");

      var bg = document.createElementNS(svg.namespaceURI, "rect");
      bg.setAttribute("width", "120"); bg.setAttribute("height", "90");
      bg.setAttribute("fill", "hsl(" + h + " 40% 88%)");
      svg.appendChild(bg);

      var shape = document.createElementNS(svg.namespaceURI, "rect");
      shape.setAttribute("x", 18 + (n % 12)); shape.setAttribute("y", 16 + (n % 9));
      shape.setAttribute("width", 60 + (n % 22)); shape.setAttribute("height", 44 + (n % 14));
      shape.setAttribute("rx", 6);
      shape.setAttribute("fill", "hsl(" + h + " 52% 42%)");
      svg.appendChild(shape);

      var dot = document.createElementNS(svg.namespaceURI, "circle");
      dot.setAttribute("cx", 92 - (n % 18)); dot.setAttribute("cy", 62 - (n % 12));
      dot.setAttribute("r", 12 + (n % 7));
      dot.setAttribute("fill", "hsl(" + ((h + 40) % 360) + " 62% 62%)");
      dot.setAttribute("opacity", "0.85");
      svg.appendChild(dot);

      return svg;
    },

    /* A star row that is never the only carrier of the number. */
    rating: function (score, count) {
      var wrap = el("span", "rating");
      var full = Math.round(score);
      var stars = el("span", "rating-stars",
        "★".repeat(full) + "☆".repeat(5 - full));
      stars.setAttribute("aria-hidden", "true");
      wrap.appendChild(stars);
      wrap.appendChild(el("span", "prod-meta",
        " " + score.toFixed(1) + " (" + count + ")"));
      return wrap;
    },

    money: function (n) {
      return "$" + n.toFixed(2);
    }
  };

  function init() {
    document.querySelectorAll(".app-shell[data-brand]").forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AppShell = AppShell;
})();
