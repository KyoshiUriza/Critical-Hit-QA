// Locator Lab — grades a learner's selector against the sandbox DOM.
//
// Two questions get answered on every evaluation:
//   1. Does it work?      (does it match, and does it match the RIGHT element)
//   2. Will it keep working? (does it lean on anything known to be volatile)
//
// The second question is the point. A selector that passes today and breaks on
// the next deploy is worse than one that fails now, because it fails silently
// and at the least convenient moment.
(function () {
  "use strict";

  var EXERCISES = window.LOCATOR_EXERCISES || [];
  var state = { index: 0, solved: {} };

  var STORAGE_KEY = "qaprep_locator_solved";

  // Heuristics that apply to every exercise, independent of the target.
  var GLOBAL_SMELLS = [
    {
      test: /\.css-[a-z0-9]{5,}|\.sc-[A-Za-z]{6,}|\.btn-a7f3c2|\.[a-z]+_[a-z0-9]{5,}__/i,
      label: "Build-generated class",
      why: "Class names like this come from a CSS-in-JS bundler. They change when the bundle changes, which is a deploy you had nothing to do with."
    },
    {
      test: /#input-\d{4,}|#mui-\d+|#:r[0-9a-z]+:|#[a-z]+-\d{5,}/i,
      label: "Generated id",
      why: "Framework-generated ids are per-render. This is the number-one cause of a suite that passes locally and fails in CI."
    },
    {
      test: /:nth-child|:nth-of-type|:first-child|:last-child/i,
      label: "Positional selector",
      why: "Position is not identity. Add, remove, or reorder a sibling and this silently points somewhere else."
    },
    {
      test: /^\s*\/html|\/body\/|\/div\[\d+\]\/|\/\*\[\d+\]/i,
      label: "Absolute XPath",
      why: "This encodes the whole DOM path. One new wrapper element above it and every locator like it breaks at once."
    },
    {
      test: /\(\s*\d+\s*\)\s*$|\[\s*\d+\s*\]\s*$/,
      label: "Index-based match",
      why: "Indexing into a match set is positional by another name."
    },
    {
      test: /style=|\[style/i,
      label: "Styling attribute",
      why: "Inline styles are presentation. They change for visual reasons that have nothing to do with the element's identity."
    }
  ];

  function el(id) { return document.getElementById(id); }

  function loadSolved() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    } catch (_) { return {}; }
  }

  function saveSolved() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.solved)); } catch (_) {}
  }

  // Accepts CSS, XPath, or Playwright locator syntax.
  // Returns { ok, nodes, error, positional }.
  //
  // Playwright syntax is accepted because the lab recommends getByRole and
  // prints it as the model answer. Grading a syntax you refuse to accept
  // teaches the wrong lesson twice: once by rejecting a correct answer, and
  // once by implying CSS is what the job wants.
  function queryAll(sel) {
    var trimmed = sel.trim();
    if (!trimmed) return { ok: false, nodes: [], error: "Type a selector first." };

    if (window.LocatorParse && window.LocatorParse.looksLikePlaywright(trimmed)) {
      return window.LocatorParse.run(trimmed);
    }

    var isXPath = trimmed.charAt(0) === "/" || trimmed.indexOf("//") === 0;
    if (isXPath) {
      try {
        var it = document.evaluate(trimmed, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var out = [];
        for (var i = 0; i < it.snapshotLength; i++) out.push(it.snapshotItem(i));
        return { ok: true, nodes: out, error: null };
      } catch (e) {
        return { ok: false, nodes: [], error: "That XPath is not valid: " + e.message };
      }
    }

    try {
      return { ok: true, nodes: Array.prototype.slice.call(document.querySelectorAll(trimmed)), error: null };
    } catch (e) {
      return { ok: false, nodes: [], error: "That is not a valid CSS selector." };
    }
  }

  function smellsFor(sel, exercise, positional) {
    var found = [];
    GLOBAL_SMELLS.forEach(function (s) {
      if (s.test.test(sel)) found.push({ label: s.label, why: s.why });
    });
    (exercise.traps || []).forEach(function (t) {
      if (t.pattern.test(sel)) found.push({ label: "Brittle for this element", why: t.why });
    });
    // .first()/.last()/.nth() resolve fine and are positional by another name,
    // so they are caught here rather than by the CSS-shaped regexes above.
    if (positional) {
      found.push({
        label: "Positional narrowing",
        why: "first(), last() and nth() pick by document order, not identity. They silence a strict-mode violation instead of resolving it — when a second match appears, you are asserting against whichever the DOM happened to order first."
      });
    }
    return found;
  }

  function targetNode(exercise) {
    return document.querySelector(exercise.target);
  }

  function evaluate() {
    var exercise = EXERCISES[state.index];
    var input = el("locator-input").value;
    var box = el("locator-result");
    box.className = "lab-result";
    box.textContent = "";

    var res = queryAll(input);
    if (!res.ok) {
      renderVerdict(box, "invalid", res.error, []);
      return;
    }

    var want = targetNode(exercise);
    var matches = res.nodes;
    var hitsTarget = want && matches.indexOf(want) > -1;
    var smells = smellsFor(input, exercise, res.positional);

    // Exercises in the no-test-id regions exist precisely because the escape
    // hatch is missing. Say so rather than letting the attempt fail as if the
    // syntax were wrong.
    if (exercise.noTestId && /getByTestId|data-testid/i.test(input)) {
      renderVerdict(box, "fail",
        "There are no data-testid attributes anywhere in this section — that is the exercise. " +
        "Most real applications you are handed will not have them either. Reach for a role, a " +
        "label, or a scoped relationship instead.", smells);
      return;
    }

    if (matches.length === 0) {
      renderVerdict(box, "fail", "Matches nothing. Check the sandbox markup below — the element exists.", smells);
      return;
    }
    if (!hitsTarget) {
      renderVerdict(box, "fail",
        "Matches " + matches.length + " element" + (matches.length === 1 ? "" : "s") +
        ", but not the one this exercise asks for.", smells);
      flash(matches.slice(0, 5), "wrong");
      return;
    }
    if (matches.length > 1) {
      renderVerdict(box, "strict",
        "Matches " + matches.length + " elements — one of them is correct. Playwright would throw a " +
        "strict-mode violation here rather than guess. Narrow it down.", smells);
      flash(matches, "wrong");
      return;
    }
    // Exactly one, and it's the right one.
    if (smells.length) {
      renderVerdict(box, "fragile",
        "Correct — it matches exactly the right element. But it will not survive.", smells);
      flash([want], "right");
      return;
    }

    renderVerdict(box, "pass", "Correct, unique, and resilient. This is the one you'd commit.", []);
    flash([want], "right");
    markSolved(exercise.id);
  }

  function renderVerdict(box, kind, message, smells) {
    var map = {
      pass:    { cls: "lab-result-pass",    icon: "✓", title: "Solid" },
      fragile: { cls: "lab-result-fragile", icon: "!", title: "Works now, breaks later" },
      strict:  { cls: "lab-result-strict",  icon: "≡", title: "Strict-mode violation" },
      fail:    { cls: "lab-result-fail",    icon: "✗", title: "Not the target" },
      invalid: { cls: "lab-result-fail",    icon: "✗", title: "Invalid selector" }
    };
    var m = map[kind];
    box.classList.add(m.cls);

    var head = document.createElement("div");
    head.className = "lab-result-head";
    var badge = document.createElement("span");
    badge.className = "lab-result-icon";
    badge.textContent = m.icon;
    var title = document.createElement("strong");
    title.textContent = m.title;
    head.append(badge, title);

    var body = document.createElement("p");
    body.className = "lab-result-msg";
    body.textContent = message;

    box.append(head, body);

    if (smells.length) {
      var list = document.createElement("ul");
      list.className = "lab-smells";
      smells.forEach(function (s) {
        var li = document.createElement("li");
        var lab = document.createElement("strong");
        lab.textContent = s.label + " — ";
        li.append(lab, document.createTextNode(s.why));
        list.appendChild(li);
      });
      box.appendChild(list);
    }
  }

  function flash(nodes, kind) {
    nodes.forEach(function (n) {
      if (!n || !n.classList) return;
      var cls = kind === "right" ? "lab-flash-right" : "lab-flash-wrong";
      n.classList.add(cls);
      setTimeout(function () { n.classList.remove(cls); }, 1600);
    });
    if (nodes[0] && nodes[0].scrollIntoView) {
      nodes[0].scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function markSolved(id) {
    if (state.solved[id]) { renderScore(); return; }
    state.solved[id] = true;
    saveSolved();
    renderScore();
    revealPlaywright();

    // Solving all six is worth the same as drafting an artifact.
    if (Object.keys(state.solved).length === EXERCISES.length && window.Progress) {
      window.Progress.incrementTestCases();
    }
  }

  function revealPlaywright() {
    var exercise = EXERCISES[state.index];
    var host = el("ex-playwright");
    host.textContent = "";
    if (!state.solved[exercise.id]) {
      var lock = document.createElement("p");
      lock.className = "text-dim";
      lock.textContent = "Solve the exercise to reveal the Playwright locator.";
      host.appendChild(lock);
      return;
    }
    ["js", "ts"].forEach(function (lang) {
      var pre = document.createElement("pre");
      pre.className = "code";
      pre.setAttribute("data-lang", lang);
      pre.textContent = exercise.playwright[lang];
      host.appendChild(pre);
    });
    if (window.CodeLang) window.CodeLang.apply(window.CodeLang.get());
  }

  function renderScore() {
    var solved = Object.keys(state.solved).filter(function (k) {
      return EXERCISES.some(function (e) { return e.id === k; });
    }).length;
    var pct = Math.round((solved / EXERCISES.length) * 100);
    el("lab-progress").style.width = pct + "%";
    el("lab-score").textContent = solved + " of " + EXERCISES.length + " solved";

    var list = el("lab-checklist");
    list.textContent = "";
    EXERCISES.forEach(function (ex, i) {
      var li = document.createElement("li");
      li.className = state.solved[ex.id] ? "solved" : "";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lab-checklist-btn";
      btn.textContent = (state.solved[ex.id] ? "✓ " : "○ ") + ex.title;
      btn.addEventListener("click", function () { go(i); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function render() {
    var ex = EXERCISES[state.index];
    el("ex-title").textContent = ex.title;
    el("ex-brief").textContent = ex.brief;
    el("ex-teaches").textContent = ex.teaches;
    el("ex-counter").textContent = (state.index + 1) + " / " + EXERCISES.length;
    el("locator-input").value = "";
    el("locator-result").textContent = "";
    el("locator-result").className = "lab-result";
    el("ex-hint-box").classList.add("hidden");
    el("ex-hint-box").textContent = "";
    el("ex-prev").disabled = state.index === 0;
    el("ex-next").disabled = state.index === EXERCISES.length - 1;
    revealPlaywright();
    renderScore();
  }

  function go(i) {
    state.index = Math.max(0, Math.min(EXERCISES.length - 1, i));
    render();
    el("locator-input").focus();
  }

  function init() {
    if (!EXERCISES.length) return;
    state.solved = loadSolved();

    el("locator-check").addEventListener("click", evaluate);
    el("locator-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); evaluate(); }
    });
    el("ex-prev").addEventListener("click", function () { go(state.index - 1); });
    el("ex-next").addEventListener("click", function () { go(state.index + 1); });

    el("ex-hint").addEventListener("click", function () {
      var box = el("ex-hint-box");
      var ex = EXERCISES[state.index];
      box.textContent = "";
      var p = document.createElement("p");
      p.className = "quiz-explanation";
      p.textContent = ex.idealHint;
      box.appendChild(p);
      box.classList.remove("hidden");
    });

    el("ex-highlight").addEventListener("click", function () {
      var want = targetNode(EXERCISES[state.index]);
      if (want) flash([want], "right");
    });

    // Sandbox interactions — the stateful traps have to actually change state.
    var cartCount = 0;
    var addBtn = el("lab-add-item");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        cartCount += 1;
        el("lab-cart-toggle").textContent = "Cart (" + cartCount + ")";
      });
    }
    var openModal = el("lab-open-modal");
    if (openModal) {
      openModal.addEventListener("click", function () {
        el("lab-modal-backdrop").classList.add("open");
      });
    }
    var cancel = document.querySelector("#lab-modal [data-testid='modal-cancel']");
    if (cancel) {
      cancel.addEventListener("click", function () {
        el("lab-modal-backdrop").classList.remove("open");
      });
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
