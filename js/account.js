/*
 * Account page behavior: profile CRUD and sync codes.
 *
 * Everything user-supplied is written with textContent, never innerHTML.
 * Profile names come from a person who may be pasting anything, and they get
 * rendered back into the page — on a site that teaches testing, being the
 * example of a self-XSS would be a poor look.
 */
(function () {
  "use strict";

  if (!window.Profiles) return;

  function el(id) { return document.getElementById(id); }

  // The stylesheet uses two conventions: .form-error is display:none until it
  // gains .visible, while .form-success is shown unless it has .hidden. Toggle
  // both so a caller does not have to know which kind it is holding — getting
  // that wrong means an error message that is set but never seen.
  function show(node, message) {
    node.textContent = message;
    node.classList.add("visible");
    node.classList.remove("hidden");
  }

  function clear(node) {
    node.textContent = "";
    node.classList.remove("visible");
    node.classList.add("hidden");
  }

  // ---- profile list -----------------------------------------------------

  function renderProfiles() {
    var list = el("profile-list");
    var profiles = window.Profiles.list();
    var activeId = window.Profiles.active().id;

    list.textContent = "";

    profiles.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "lab-ex-head profile-row";
      row.setAttribute("data-testid", "profile-row");
      row.setAttribute("data-profile-id", p.id);

      var label = document.createElement("div");
      var name = document.createElement("strong");
      name.textContent = p.name;
      label.appendChild(name);

      if (p.id === activeId) {
        var badge = document.createElement("span");
        badge.className = "profile-badge";
        badge.textContent = "Active";
        badge.setAttribute("data-testid", "active-badge");
        label.appendChild(badge);
      }

      var meta = document.createElement("div");
      meta.className = "text-dim";
      var data = readProfileSummary(p.id);
      meta.textContent = data;
      label.appendChild(meta);

      var actions = document.createElement("div");
      actions.className = "lab-ex-nav";

      if (p.id !== activeId) {
        var use = document.createElement("button");
        use.className = "btn btn-primary btn-sm";
        use.textContent = "Switch to this";
        use.setAttribute("data-testid", "switch-profile");
        use.addEventListener("click", function () {
          window.Profiles.switchTo(p.id);
          renderAll();
        });
        actions.appendChild(use);
      }

      var rename = document.createElement("button");
      rename.className = "btn btn-ghost btn-sm";
      rename.textContent = "Rename";
      rename.addEventListener("click", function () {
        var next = window.prompt("New name for this profile:", p.name);
        if (next === null) return;
        try {
          window.Profiles.rename(p.id, next);
          renderAll();
        } catch (err) {
          window.alert(err.message);
        }
      });
      actions.appendChild(rename);

      if (profiles.length > 1) {
        var del = document.createElement("button");
        del.className = "btn btn-ghost btn-sm";
        del.textContent = "Delete";
        del.setAttribute("data-testid", "delete-profile");
        del.addEventListener("click", function () {
          if (!window.confirm('Delete "' + p.name + '" and all of its progress? This cannot be undone.')) return;
          try {
            window.Profiles.remove(p.id);
            renderAll();
          } catch (err) {
            window.alert(err.message);
          }
        });
        actions.appendChild(del);
      }

      row.appendChild(label);
      row.appendChild(actions);
      list.appendChild(row);
    });

    el("profile-count").textContent =
      profiles.length + " of " + window.Profiles.MAX_PROFILES + " used";
  }

  // Reads another profile's stored data without switching to it, so the list
  // can show what is in each one before you commit to opening it.
  function readProfileSummary(id) {
    var key = id === window.Profiles.DEFAULT_ID
      ? "qaprep_progress_v1"
      : "qaprep_progress_v1:" + id;
    var data;
    try {
      data = JSON.parse(localStorage.getItem(key) || "{}");
    } catch (_) {
      return "Nothing recorded yet";
    }
    var runs = (data.quiz && Array.isArray(data.quiz.runs) ? data.quiz.runs.length : 0);
    var drafts = Array.isArray(data.artifacts) ? data.artifacts.length : 0;
    var finds = 0;
    if (data.bugBounty) {
      Object.keys(data.bugBounty).forEach(function (k) {
        if (Array.isArray(data.bugBounty[k])) finds += data.bugBounty[k].length;
      });
    }
    if (!runs && !drafts && !finds) return "Nothing recorded yet";
    return runs + " quiz run" + (runs === 1 ? "" : "s") +
           " · " + finds + " defect" + (finds === 1 ? "" : "s") + " found" +
           " · " + drafts + " draft" + (drafts === 1 ? "" : "s");
  }

  // ---- create -----------------------------------------------------------

  function wireCreate() {
    var input = el("new-name");
    var errorBox = el("create-error");

    function submit() {
      clear(errorBox);
      try {
        window.Profiles.create(input.value);
        input.value = "";
        renderAll();
      } catch (err) {
        show(errorBox, err.message);
        input.focus();
      }
    }

    el("create-btn").addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
  }

  // ---- export -----------------------------------------------------------

  function wireExport() {
    var out = el("export-out");
    var copy = el("copy-btn");
    var meta = el("export-meta");

    el("export-btn").addEventListener("click", function () {
      var code = window.Profiles.exportCode();
      out.value = code;
      out.classList.remove("hidden");
      copy.hidden = false;

      // Measured: progress with no drafts is about 6,000 characters, and the
      // TWELFTH saved draft takes it to roughly 30,000. This comment used to
      // say "a hundred drafts", which put the limit an order of magnitude
      // further away than it is — the code is a fine transport for progress
      // and a poor one for drafts, and that happens almost immediately.
      if (code.length > 4000) {
        meta.textContent =
          "This code is " + code.length.toLocaleString() + " characters — long enough that " +
          "copying it by hand is awkward. The JSON export on the Progress page is easier for a backup this size.";
      } else {
        meta.textContent =
          "Keep this somewhere safe. Anyone with it can load your progress, though " +
          "there is nothing personal in it beyond what you typed into your drafts.";
      }
    });

    copy.addEventListener("click", function () {
      out.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_) {}
      // navigator.clipboard needs a secure context, which file:// is not, and
      // this site is meant to work when opened straight off disk.
      copy.textContent = ok ? "Copied" : "Press Ctrl+C";
      setTimeout(function () { copy.textContent = "Copy"; }, 2000);
    });
  }

  // ---- import -----------------------------------------------------------

  function wireImport() {
    var input = el("import-in");
    var errorBox = el("import-error");
    var okBox = el("import-ok");
    var confirmBox = el("confirm-box");
    var pending = null;

    function summarize(decoded) {
      var d = decoded.data;
      var runs = d.quiz && d.quiz.runs ? d.quiz.runs.length : 0;
      var drafts = d.artifacts ? d.artifacts.length : 0;
      var finds = 0;
      Object.keys(d.bugBounty || {}).forEach(function (k) { finds += d.bugBounty[k].length; });
      var who = decoded.name ? '"' + decoded.name + '"' : "an unnamed profile";
      var when = decoded.savedAt ? " saved " + decoded.savedAt : "";
      return "This code is from " + who + when + ". It contains " +
             runs + " quiz run" + (runs === 1 ? "" : "s") + ", " +
             finds + " defect" + (finds === 1 ? "" : "s") + " found, and " +
             drafts + " draft" + (drafts === 1 ? "" : "s") + ".";
    }

    el("preview-btn").addEventListener("click", function () {
      clear(errorBox);
      clear(okBox);
      confirmBox.classList.add("hidden");
      try {
        pending = window.Profiles.decodeCode(input.value);
      } catch (err) {
        pending = null;
        show(errorBox, err.message);
        return;
      }
      el("target-name").textContent = window.Profiles.active().name;
      el("confirm-summary").textContent = summarize(pending);
      confirmBox.classList.remove("hidden");
    });

    el("apply-btn").addEventListener("click", function () {
      if (!pending) return;
      window.Profiles.applyDecoded(pending);
      pending = null;
      input.value = "";
      confirmBox.classList.add("hidden");
      show(okBox, "Progress loaded into " + window.Profiles.active().name + ".");
      renderProfiles();
    });

    el("cancel-btn").addEventListener("click", function () {
      pending = null;
      confirmBox.classList.add("hidden");
    });
  }

  function renderAll() {
    renderProfiles();
  }

  renderAll();
  wireCreate();
  wireExport();
  wireImport();
})();
