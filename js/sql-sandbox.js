// SQL Sandbox controller. Runs the learner's query through MiniSQL, renders the
// result set, and grades on the RESULT rather than the query text — so any
// correct approach passes, which is how a real reviewer would judge it.
(function () {
  "use strict";

  var EXERCISES = window.SQL_EXERCISES || [];
  var STORAGE_KEY = "qaprep_sql_solved";
  var db, state = { index: 0, solved: {} };

  function el(id) { return document.getElementById(id); }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadSolved() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    } catch (_) { return {}; }
  }
  function saveSolved() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.solved)); } catch (_) {}
  }

  function resetData() {
    db = clone(window.SQL_DB);
    renderTables();
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function buildTable(columns, rows, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "sql-table-wrap";

    var table = document.createElement("table");
    table.className = "data-table";

    var thead = document.createElement("thead");
    var htr = document.createElement("tr");
    columns.forEach(function (c) {
      var th = document.createElement("th");
      th.textContent = c;
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = columns.length || 1;
      td.className = "text-dim";
      td.style.textAlign = "center";
      td.style.padding = "18px";
      td.textContent = "0 rows";
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        columns.forEach(function (c) {
          var td = document.createElement("td");
          var v = r[c];
          if (v === null || v === undefined) {
            td.textContent = "NULL";
            td.className = "sql-null";       // NULL must be visually distinct from ''
          } else if (v === "") {
            td.textContent = "''";
            td.className = "sql-empty";
          } else {
            td.textContent = String(v);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    if (opts.caption) {
      var cap = document.createElement("p");
      cap.className = "text-dim sql-caption";
      cap.textContent = opts.caption;
      wrap.insertBefore(cap, table);
    }
    return wrap;
  }

  function renderTables() {
    var host = el("sql-tables");
    host.textContent = "";
    Object.keys(db).forEach(function (name) {
      var rows = db[name];
      var cols = Object.keys(rows[0] || {});
      var section = document.createElement("div");
      section.className = "panel";
      var h = document.createElement("h3");
      h.style.marginTop = "0";
      h.textContent = name;
      var count = document.createElement("span");
      count.className = "text-dim";
      count.style.fontWeight = "400";
      count.style.fontSize = "0.85rem";
      count.textContent = "  ·  " + rows.length + " rows";
      h.appendChild(count);
      section.appendChild(h);
      section.appendChild(buildTable(cols, rows));
      host.appendChild(section);
    });

    var schema = el("sql-schema");
    schema.textContent = "";
    Object.keys(db).forEach(function (name) {
      var d = document.createElement("div");
      d.className = "sql-schema-item";
      var strong = document.createElement("strong");
      strong.textContent = name;
      var cols = document.createElement("div");
      cols.className = "text-dim";
      cols.textContent = Object.keys(db[name][0] || {}).join(", ");
      d.append(strong, cols);
      schema.appendChild(d);
    });
  }

  function verdict(kind, title, message) {
    var box = el("sql-verdict");
    box.textContent = "";
    box.className = "lab-result";
    var map = {
      pass:  { cls: "lab-result-pass", icon: "✓" },
      near:  { cls: "lab-result-fragile", icon: "!" },
      fail:  { cls: "lab-result-fail", icon: "✗" },
      info:  { cls: "lab-result-strict", icon: "i" }
    };
    var m = map[kind];
    box.classList.add(m.cls);

    var head = document.createElement("div");
    head.className = "lab-result-head";
    var badge = document.createElement("span");
    badge.className = "lab-result-icon";
    badge.textContent = m.icon;
    var t = document.createElement("strong");
    t.textContent = title;
    head.append(badge, t);

    var p = document.createElement("p");
    p.className = "lab-result-msg";
    p.textContent = message;

    box.append(head, p);
  }

  // ── Running ──────────────────────────────────────────────────────────────
  function runQuery() {
    var sql = el("sql-input").value;
    var out = el("sql-output");
    out.textContent = "";

    if (!sql.trim()) {
      verdict("fail", "Nothing to run", "Type a query first.");
      return;
    }

    var result;
    try {
      result = window.MiniSQL.run(db, sql);
    } catch (e) {
      verdict("fail", "Query error", e.message);
      return;
    }

    if (result.kind === "delete") {
      if (result.warning) {
        verdict("fail", "Refused to run", result.warning +
          " This is exactly why the SELECT-first rule exists — the sandbox is stopping you, but a real database would not.");
        return;
      }
      db[result.table] = result.remaining;
      renderTables();
      verdict("info", "Rows deleted",
        result.deleted + " row" + (result.deleted === 1 ? "" : "s") + " removed from " + result.table +
        ". Use \"Reset data\" to restore the dataset.");
      return;
    }

    // Show the result set regardless of grading.
    out.appendChild(buildTable(result.columns, result.rows, {
      caption: result.rows.length + " row" + (result.rows.length === 1 ? "" : "s") + " returned"
    }));

    var ex = EXERCISES[state.index];
    var correct = false;
    try { correct = !!ex.check(result); } catch (_) { correct = false; }

    if (correct) {
      verdict("pass", "Correct", "That's the result the exercise asked for.");
      markSolved(ex.id);
    } else if (result.rows.length === 0) {
      verdict("fail", "No rows", "The query ran but matched nothing. Check your WHERE clause — and remember NULL never equals anything, not even NULL.");
    } else {
      verdict("near", "Ran, but not the answer",
        "The query is valid SQL and returned " + result.rows.length + " row" +
        (result.rows.length === 1 ? "" : "s") + ", but not what this exercise asked for. Compare against the brief.");
    }
  }

  function markSolved(id) {
    if (state.solved[id]) { renderScore(); return; }
    state.solved[id] = true;
    saveSolved();
    renderScore();
    if (Object.keys(state.solved).length === EXERCISES.length && window.Progress) {
      window.Progress.incrementTestCases();
    }
  }

  function renderScore() {
    var solved = Object.keys(state.solved).filter(function (k) {
      return EXERCISES.some(function (e) { return e.id === k; });
    }).length;
    el("sql-progress").style.width = Math.round((solved / EXERCISES.length) * 100) + "%";
    el("sql-score").textContent = solved + " of " + EXERCISES.length + " solved";

    var list = el("sql-checklist");
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
    el("sql-title").textContent = ex.title;
    el("sql-brief").textContent = ex.brief;
    el("sql-teaches").textContent = ex.teaches;
    el("sql-counter").textContent = (state.index + 1) + " / " + EXERCISES.length;
    el("sql-input").value = "";
    el("sql-verdict").textContent = "";
    el("sql-verdict").className = "lab-result";
    el("sql-output").textContent = "";
    el("sql-prev").disabled = state.index === 0;
    el("sql-next").disabled = state.index === EXERCISES.length - 1;
    renderScore();
  }

  function go(i) {
    state.index = Math.max(0, Math.min(EXERCISES.length - 1, i));
    render();
    el("sql-input").focus();
  }

  function init() {
    if (!EXERCISES.length || !window.MiniSQL) return;
    state.solved = loadSolved();
    resetData();

    el("sql-run").addEventListener("click", runQuery);
    el("sql-input").addEventListener("keydown", function (e) {
      // Ctrl/Cmd+Enter runs, matching every SQL client the learner will meet.
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runQuery(); }
    });
    el("sql-prev").addEventListener("click", function () { go(state.index - 1); });
    el("sql-next").addEventListener("click", function () { go(state.index + 1); });
    el("sql-reset").addEventListener("click", function () {
      resetData();
      verdict("info", "Data reset", "The dataset is back to its original state.");
    });
    el("sql-hint").addEventListener("click", function () {
      el("sql-input").value = EXERCISES[state.index].hint;
      el("sql-input").focus();
      verdict("info", "Solution filled in", "Run it to see the result — then try to reconstruct it yourself on the next exercise.");
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
