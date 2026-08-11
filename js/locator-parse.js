/*
 * Playwright locator syntax → DOM nodes.
 *
 * The lab told learners to prefer getByRole, printed getByRole as the model
 * answer, and then rejected getByRole because the input only accepted CSS and
 * XPath. Teaching one thing and grading another is the worst version of this
 * exercise, so the grader now speaks the syntax it recommends.
 *
 * Supported:
 *   getByRole('button', { name: 'Save' })   exact / substring / regex name
 *   getByLabel('Email')
 *   getByPlaceholder('you@example.com')
 *   getByText('Delete')
 *   getByTitle('Close')
 *   getByTestId('submit')
 *   .filter({ hasText: 'Invoice 1042' })
 *   .first() / .last() / .nth(n)            resolved, and flagged as positional
 *   chaining: getByRole('row', …).getByRole('button', …)
 *   a leading page. / await / trailing .click() are tolerated and ignored
 *
 * THE HONEST LIMITATION, stated because a learner will meet the difference:
 * this is an approximation of the accessibility tree, not a real one. Roles
 * come from a tag/attribute mapping and names from the common labeling paths
 * (aria-label, aria-labelledby, <label>, text, placeholder, title). Playwright
 * uses the browser's computed tree, so exotic ARIA will diverge. Everything in
 * this sandbox is deliberately within the common cases.
 */
(function () {
  "use strict";

  // role -> CSS that can express it. Roles the sandbox does not use are
  // omitted rather than guessed at.
  var ROLE_SELECTORS = {
    button: 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]',
    link: 'a[href], [role="link"]',
    textbox: 'input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, [role="textbox"]',
    checkbox: 'input[type="checkbox"], [role="checkbox"]',
    radio: 'input[type="radio"], [role="radio"]',
    combobox: 'select, [role="combobox"]',
    heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
    row: 'tr, [role="row"]',
    cell: 'td, th, [role="cell"], [role="gridcell"]',
    columnheader: 'th, [role="columnheader"]',
    listitem: 'li, [role="listitem"]',
    list: 'ul, ol, [role="list"]',
    table: 'table, [role="table"]',
    dialog: '[role="dialog"], dialog',
    status: '[role="status"], output',
    alert: '[role="alert"]',
    img: 'img, [role="img"]',
    group: 'fieldset, [role="group"]',
    article: 'article, [role="article"]',
    region: 'section[aria-label], section[aria-labelledby], [role="region"]',
    navigation: 'nav, [role="navigation"]',
    form: 'form, [role="form"]'
  };

  function visibleText(node) {
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  // The common labeling paths, in roughly the order the spec resolves them.
  function accessibleName(node) {
    var aria = node.getAttribute && node.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();

    var by = node.getAttribute && node.getAttribute("aria-labelledby");
    if (by) {
      var parts = by.split(/\s+/).map(function (id) {
        var t = document.getElementById(id);
        return t ? visibleText(t) : "";
      }).filter(Boolean);
      if (parts.length) return parts.join(" ");
    }

    if (node.id) {
      var lbl = document.querySelector('label[for="' + CSS.escape(node.id) + '"]');
      if (lbl) return visibleText(lbl);
    }

    // An input wrapped in its label.
    var wrapping = node.closest && node.closest("label");
    if (wrapping && /^(INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) {
      return visibleText(wrapping);
    }

    var tag = node.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") {
      var ph = node.getAttribute("placeholder");
      if (ph) return ph.trim();
      var val = node.getAttribute("value");
      if (val && /^(button|submit|reset)$/i.test(node.getAttribute("type") || "")) return val.trim();
      return "";
    }
    if (tag === "IMG") return (node.getAttribute("alt") || "").trim();

    return visibleText(node);
  }

  function nameMatches(actual, wanted, exact) {
    if (wanted instanceof RegExp) return wanted.test(actual);
    if (exact) return actual === wanted;
    // Playwright's default is case-insensitive, whitespace-normalized substring.
    return actual.toLowerCase().indexOf(String(wanted).toLowerCase()) !== -1;
  }

  // ── argument parsing ─────────────────────────────────────────────────
  // Deliberately not eval: this is user input on a page with a CSP that
  // forbids unsafe-eval, and the site would be a poor advertisement for
  // testing if its own lab executed whatever you typed.
  function parseString(src) {
    var m = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/.exec(src);
    if (!m) return null;
    return { value: m[2].replace(/\\(['"`\\])/g, "$1"), rest: src.slice(m[0].length) };
  }

  function parseRegex(src) {
    var m = /^\s*\/((?:\\.|[^\/\\])+)\/([gimsuy]*)/.exec(src);
    if (!m) return null;
    try {
      return { value: new RegExp(m[1], m[2]), rest: src.slice(m[0].length) };
    } catch (_) {
      return null;
    }
  }

  // nth(1) passes a bare number, which is neither a string nor a regex — the
  // first version of this parser handled only those two and rejected nth()
  // outright, which is exactly the positional case the lab needs to grade.
  function parseNumber(src) {
    var m = /^\s*(-?\d+)/.exec(src);
    if (!m) return null;
    return { value: Number(m[1]), rest: src.slice(m[0].length) };
  }

  // { name: 'Save', exact: true, hasText: 'x' } — only the keys we support.
  function parseOptions(src) {
    var out = {};
    var m = /^\s*\{/.exec(src);
    if (!m) return { value: out, rest: src };
    var rest = src.slice(m[0].length);

    for (var guard = 0; guard < 12; guard++) {
      var key = /^\s*(['"]?)([A-Za-z]+)\1\s*:/.exec(rest);
      if (!key) break;
      rest = rest.slice(key[0].length);
      var name = key[2];

      var str = parseString(rest) || parseRegex(rest);
      if (str) {
        out[name] = str.value;
        rest = str.rest;
      } else {
        var bool = /^\s*(true|false)/.exec(rest);
        if (bool) {
          out[name] = bool[1] === "true";
          rest = rest.slice(bool[0].length);
        } else {
          var num = /^\s*(-?\d+)/.exec(rest);
          if (!num) break;
          out[name] = Number(num[1]);
          rest = rest.slice(num[0].length);
        }
      }
      var comma = /^\s*,/.exec(rest);
      if (comma) rest = rest.slice(comma[0].length);
    }
    var close = /^\s*\}/.exec(rest);
    if (close) rest = rest.slice(close[0].length);
    return { value: out, rest: rest };
  }

  function looksLikePlaywright(src) {
    return /(^|\.)\s*(getBy(Role|Label|Placeholder|Text|TestId|Title|AltText)|locator)\s*\(/.test(src);
  }

  /**
   * @returns {{ ok:boolean, nodes:Element[], error:string|null, positional:boolean }}
   */
  function run(input) {
    var src = String(input || "").trim();

    // Tolerate the shapes people paste out of a spec file.
    src = src.replace(/^await\s+/, "").replace(/;$/, "").trim();
    src = src.replace(/^(page|frame|component)\s*\./, "");
    src = src.replace(/\.\s*(click|fill|check|hover|press|textContent|innerText|isVisible|toBeVisible)\s*\([^)]*\)\s*$/, "");

    var scope = [document.documentElement];
    var positional = false;
    var consumedSomething = false;
    var guard = 0;

    while (src.length && guard++ < 12) {
      var call = /^\.?\s*([A-Za-z]+)\s*\(/.exec(src);
      if (!call) break;
      var method = call[1];
      var rest = src.slice(call[0].length);

      var first = parseString(rest) || parseRegex(rest) || parseNumber(rest);
      var opts = { value: {}, rest: rest };

      if (first) {
        opts = parseOptions(first.rest.replace(/^\s*,/, ""));
      } else {
        opts = parseOptions(rest);
      }

      // Close the call.
      var close = /^\s*\)/.exec(opts.rest);
      if (!close) {
        return { ok: false, nodes: [], error: "Could not parse " + method + "(...) — check the quotes and brackets.", positional: false };
      }
      src = opts.rest.slice(close[0].length).trim();

      var candidates = [];
      var i;

      function within(sel) {
        var found = [];
        scope.forEach(function (root) {
          Array.prototype.forEach.call(root.querySelectorAll(sel), function (n) {
            if (found.indexOf(n) === -1) found.push(n);
          });
        });
        return found;
      }

      switch (method) {
        case "getByRole":
          if (!first) return { ok: false, nodes: [], error: "getByRole needs a role, e.g. getByRole('button', { name: 'Save' }).", positional: false };
          var roleSel = ROLE_SELECTORS[String(first.value).toLowerCase()];
          if (!roleSel) {
            return { ok: false, nodes: [], error: 'This lab does not model the role "' + first.value + '". Supported: ' + Object.keys(ROLE_SELECTORS).sort().join(", ") + ".", positional: false };
          }
          candidates = within(roleSel);
          if (opts.value.name !== undefined) {
            candidates = candidates.filter(function (n) {
              return nameMatches(accessibleName(n), opts.value.name, !!opts.value.exact);
            });
          }
          break;

        case "getByLabel":
          candidates = within("input, select, textarea, [role='textbox'], [role='checkbox'], [role='radio'], [role='combobox']")
            .filter(function (n) {
              return nameMatches(accessibleName(n), first ? first.value : "", !!opts.value.exact);
            });
          break;

        case "getByPlaceholder":
          candidates = within("[placeholder]").filter(function (n) {
            return nameMatches(n.getAttribute("placeholder") || "", first ? first.value : "", !!opts.value.exact);
          });
          break;

        case "getByTestId":
          candidates = within("[data-testid]").filter(function (n) {
            return nameMatches(n.getAttribute("data-testid") || "", first ? first.value : "", true);
          });
          break;

        case "getByTitle":
          candidates = within("[title]").filter(function (n) {
            return nameMatches(n.getAttribute("title") || "", first ? first.value : "", !!opts.value.exact);
          });
          break;

        case "getByAltText":
          candidates = within("[alt]").filter(function (n) {
            return nameMatches(n.getAttribute("alt") || "", first ? first.value : "", !!opts.value.exact);
          });
          break;

        case "getByText":
          candidates = within("*").filter(function (n) {
            if (n.children.length && !nameMatches(visibleText(n), first ? first.value : "", !!opts.value.exact)) return false;
            return nameMatches(visibleText(n), first ? first.value : "", !!opts.value.exact);
          });
          // Playwright resolves to the smallest element containing the text.
          candidates = candidates.filter(function (n) {
            return !candidates.some(function (o) { return o !== n && n.contains(o); });
          });
          break;

        case "locator":
          if (!first) return { ok: false, nodes: [], error: "locator() needs a selector string.", positional: false };
          try {
            candidates = within(String(first.value));
          } catch (e) {
            return { ok: false, nodes: [], error: "That CSS is not valid: " + e.message, positional: false };
          }
          break;

        case "filter":
          candidates = scope.filter(function (n) {
            if (opts.value.hasText !== undefined) {
              return nameMatches(visibleText(n), opts.value.hasText, false);
            }
            return true;
          });
          break;

        case "first":
          positional = true;
          candidates = scope.slice(0, 1);
          break;
        case "last":
          positional = true;
          candidates = scope.slice(-1);
          break;
        case "nth":
          positional = true;
          var idx = first ? Number(first.value) : 0;
          candidates = scope[idx] ? [scope[idx]] : [];
          break;

        default:
          return { ok: false, nodes: [], error: "This lab does not support ." + method + "() yet. Supported: getByRole, getByLabel, getByPlaceholder, getByText, getByTestId, getByTitle, locator, filter, first, last, nth.", positional: false };
      }

      scope = candidates;
      consumedSomething = true;
      if (!scope.length) break;
    }

    if (!consumedSomething) {
      return { ok: false, nodes: [], error: "Could not read that as a Playwright locator.", positional: false };
    }
    // Never return the root as a "match" — that means nothing was narrowed.
    if (scope.length === 1 && scope[0] === document.documentElement) {
      return { ok: true, nodes: [], error: null, positional: positional };
    }
    return { ok: true, nodes: scope, error: null, positional: positional };
  }

  window.LocatorParse = {
    run: run,
    looksLikePlaywright: looksLikePlaywright,
    accessibleName: accessibleName,
    ROLES: Object.keys(ROLE_SELECTORS).sort()
  };
})();
