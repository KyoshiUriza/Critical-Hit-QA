// My Portfolio — lists saved artifacts and exports them as one document.
//
// Per ADR 0001, exported artifacts must NOT carry the Lattice's in-universe
// vocabulary. The lore belongs to the study experience; this output goes to
// employers, so it stays plain and professional.
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  function fmtDate(ms) {
    if (!ms) return "";
    var d = new Date(ms);
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  // ── Markdown rendering ────────────────────────────────────────────────
  function stepsMd(steps) {
    var rows = (steps || []).filter(function (s) { return (s.action || "").trim(); });
    if (!rows.length) return "_No steps recorded._";
    return rows.map(function (s, i) {
      return (i + 1) + ". " + s.action.trim() +
             (s.expected && s.expected.trim() ? "  \n   _Expected:_ " + s.expected.trim() : "");
    }).join("\n");
  }

  function bugToMd(a) {
    var f = a.fields;
    return [
      "## " + (f["br-id"] ? f["br-id"] + " — " : "") + (f["br-title"] || "(untitled)"),
      "",
      "| | |",
      "|---|---|",
      "| **Severity** | " + (f["br-severity"] || "—") + " |",
      "| **Priority** | " + (f["br-priority"] || "—") + " |",
      "| **Environment** | " + (f["br-env"] || "—") + " |",
      "| **Frequency** | " + (f["br-freq"] || "—") + " |",
      f["br-regression"] ? "| **Regression** | " + f["br-regression"] + " |" : null,
      "",
      "**Preconditions**  ",
      f["br-pre"] || "_None recorded._",
      "",
      "**Steps to reproduce**",
      stepsMd(f.steps),
      "",
      "**Expected result**  ",
      f["br-expected"] || "_Not recorded._",
      "",
      "**Actual result**  ",
      f["br-actual"] || "_Not recorded._",
      "",
      f["br-evidence"] ? "**Evidence**  \n" + f["br-evidence"] + "\n" : null,
      f["br-notes"] ? "**Notes**  \n" + f["br-notes"] + "\n" : null
    ].filter(function (x) { return x !== null; }).join("\n");
  }

  function caseToMd(a) {
    var f = a.fields;
    var steps = (f.steps || []).filter(function (s) { return (s.action || "").trim(); });
    var table = steps.length
      ? ["| # | Action | Expected |", "|---|---|---|"].concat(
          steps.map(function (s, i) {
            return "| " + (i + 1) + " | " + s.action.trim().replace(/\|/g, "\\|") +
                   " | " + (s.expected || "").trim().replace(/\|/g, "\\|") + " |";
          })).join("\n")
      : "_No steps recorded._";
    return [
      "## " + (f["tc-id"] ? f["tc-id"] + " — " : "") + (f["tc-title"] || "(untitled)"),
      "",
      "**Feature:** " + (f["tc-feature"] || "—") + "  ",
      "**Priority:** " + (f["tc-priority"] || "—") + "  ",
      "**Type:** " + (f["tc-type"] || "—"),
      "",
      "**Preconditions**  ",
      f["tc-pre"] || "_None recorded._",
      "",
      f["tc-data"] ? "**Test data**  \n" + f["tc-data"] + "\n" : null,
      "**Steps**",
      table,
      "",
      "**Expected result**  ",
      f["tc-expected"] || "_Not recorded._"
    ].filter(function (x) { return x !== null; }).join("\n");
  }

  function buildMarkdown() {
    var bugs = window.Progress.listArtifacts("bug-report");
    var cases = window.Progress.listArtifacts("test-case");
    var out = [
      "# QA Portfolio",
      "",
      "_" + bugs.length + " bug report" + (bugs.length === 1 ? "" : "s") +
      " and " + cases.length + " test case" + (cases.length === 1 ? "" : "s") +
      ", written against the practice applications at Critical Hit QA._",
      ""
    ];
    if (bugs.length) {
      out.push("---", "", "# Bug reports", "");
      bugs.forEach(function (a) { out.push(bugToMd(a), ""); });
    }
    if (cases.length) {
      out.push("---", "", "# Test cases", "");
      cases.forEach(function (a) { out.push(caseToMd(a), ""); });
    }
    return out.join("\n");
  }

  // ── Listing ───────────────────────────────────────────────────────────
  function renderList(hostId, type, editHref) {
    var host = el(hostId);
    host.textContent = "";
    var items = window.Progress.listArtifacts(type);

    if (!items.length) {
      var p = document.createElement("p");
      p.className = "text-dim";
      p.textContent = "None yet.";
      host.appendChild(p);
      return 0;
    }

    items.forEach(function (a) {
      var row = document.createElement("div");
      row.className = "artifact-row";
      row.setAttribute("data-testid", "artifact-" + type);

      var main = document.createElement("div");
      main.className = "artifact-main";
      var title = document.createElement("div");
      title.className = "artifact-title";
      title.textContent = a.title;
      var meta = document.createElement("div");
      meta.className = "artifact-meta";
      meta.textContent = "updated " + fmtDate(a.updatedAt);
      main.append(title, meta);

      var open = document.createElement("a");
      open.className = "btn btn-ghost btn-sm";
      open.href = editHref + "?id=" + encodeURIComponent(a.id);
      open.textContent = "Open";

      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost btn-sm";
      del.setAttribute("aria-label", "Delete " + a.title);
      del.setAttribute("data-testid", "delete-artifact");
      del.textContent = "×";
      del.addEventListener("click", function () {
        if (!confirm('Delete "' + a.title + '"? This cannot be undone.')) return;
        window.Progress.deleteArtifact(a.id);
        render();
      });

      row.append(main, open, del);
      host.appendChild(row);
    });
    return items.length;
  }

  function render() {
    var bugs = renderList("list-bugs", "bug-report", "bug-report-builder.html");
    var cases = renderList("list-cases", "test-case", "test-case-builder.html");
    var total = bugs + cases;

    el("empty-state").classList.toggle("hidden", total > 0);
    el("portfolio-body").classList.toggle("hidden", total === 0);
    el("count-bugs").textContent = bugs ? "· " + bugs : "";
    el("count-cases").textContent = cases ? "· " + cases : "";
  }

  function showExport(text) {
    var out = el("export-out");
    out.textContent = text;
    out.classList.remove("hidden");
    return text;
  }

  function init() {
    if (!window.Progress) return;

    el("export-md").addEventListener("click", function () { showExport(buildMarkdown()); });
    el("export-json").addEventListener("click", function () {
      showExport(JSON.stringify(window.Progress.listArtifacts(), null, 2));
    });
    el("copy-export").addEventListener("click", function () {
      var text = el("export-out").textContent || buildMarkdown();
      showExport(text);
      navigator.clipboard.writeText(text);
      el("export-hint").textContent = "Copied to clipboard.";
    });
    el("download-export").addEventListener("click", function () {
      var text = el("export-out").textContent || buildMarkdown();
      showExport(text);
      var blob = new Blob([text], { type: "text/markdown" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "qa-portfolio.md";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
