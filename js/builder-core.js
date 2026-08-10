// Shared behaviour for the Test Case Builder and the Bug Report Builder.
//
// The two pages were near-clones: addStep / collect / preview / copy / save all
// duplicated. More importantly, both threw the draft away — "Save to progress"
// only incremented a counter, so twelve fields of authoring vanished on
// refresh while the home page advertised "export it into your portfolio".
//
// This module owns:
//   - autosave (debounced, so a refresh never costs work)
//   - save / load / new against Progress.artifacts
//   - restoring a draft by ?id= so "My Artifacts" can reopen one
//   - prefill from a Bug Bounty defect via ?app=&defect=
//
// A page supplies a config describing its own fields; everything else is here.
(function () {
  "use strict";

  var AUTOSAVE_MS = 800;

  function BuilderCore(config) {
    this.cfg = config;              // { type, fieldIds, stepsContainerId, titleFieldId, addStep, collect, apply, clear }
    this.currentId = null;
    this.timer = null;
    this.dirty = false;
  }

  BuilderCore.prototype.init = function () {
    var self = this;

    // Reopen an existing artifact, or prefill from a bug-bounty find.
    var params = new URLSearchParams(location.search);
    var id = params.get("id");
    if (id) {
      var art = window.Progress.getArtifact(id);
      if (art && art.type === this.cfg.type) {
        this.currentId = art.id;
        this.cfg.apply(art.fields);
        this.status("Reopened “" + art.title + "”.");
      } else {
        this.status("That draft no longer exists — starting a new one.", true);
      }
    } else if (params.get("app") && this.cfg.prefillFromDefect) {
      this.cfg.prefillFromDefect(params.get("app"), params.get("defect"));
      this.status("Prefilled from your Bug Bounty find. Fill in the rest.");
      this.touch();
    }

    // Autosave on any input in the form region.
    document.addEventListener("input", function (e) {
      if (!self.owns(e.target)) return;
      self.dirty = true;
      self.schedule();
    });
    document.addEventListener("change", function (e) {
      if (!self.owns(e.target)) return;
      self.dirty = true;
      self.schedule();
    });

    // Don't lose the last keystrokes if the tab closes mid-debounce.
    window.addEventListener("beforeunload", function () {
      if (self.dirty) self.persist(true);
    });

    this.renderRecent();
  };

  // Only autosave things inside the builder, not unrelated page controls.
  BuilderCore.prototype.owns = function (el) {
    if (!el || !el.closest) return false;
    return !!el.closest(".test-case-form");
  };

  // Programmatic fills (Load example, prefill-from-defect) set .value directly,
  // which emits no `input` event — so autosave would never see them. Callers
  // that populate the form in code must call this.
  BuilderCore.prototype.touch = function () {
    this.dirty = true;
    this.schedule();
  };

  BuilderCore.prototype.schedule = function () {
    var self = this;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () { self.persist(); }, AUTOSAVE_MS);
  };

  BuilderCore.prototype.persist = function (silent) {
    var fields = this.cfg.collect();
    // Don't create an empty record just because the page was opened.
    if (!this.cfg.hasContent(fields)) return;

    this.currentId = window.Progress.saveArtifact({
      id: this.currentId,
      type: this.cfg.type,
      title: this.cfg.titleOf(fields),
      fields: fields
    });
    this.dirty = false;
    if (!silent) this.status("Saved.");
    this.renderRecent();
  };

  BuilderCore.prototype.saveNow = function () {
    var fields = this.cfg.collect();
    if (!this.cfg.hasContent(fields)) {
      this.status("Nothing to save yet — fill in a title at least.", true);
      return;
    }
    this.persist();
    this.status("Saved to your portfolio.");
  };

  BuilderCore.prototype.startNew = function () {
    if (this.dirty) this.persist(true);
    this.currentId = null;
    this.cfg.clear();
    this.status("Started a new draft. The previous one is saved.");
    this.renderRecent();
  };

  BuilderCore.prototype.status = function (msg, isWarning) {
    var el = document.getElementById("save-note");
    if (!el) return;
    el.textContent = msg;
    el.className = isWarning ? "text-dim builder-status is-warning" : "text-dim builder-status";
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(function () { el.textContent = ""; }, 3000);
  };

  // A short list of this builder's own drafts, so the work is visibly kept.
  BuilderCore.prototype.renderRecent = function () {
    var host = document.getElementById("recent-drafts");
    if (!host) return;
    var self = this;
    var items = window.Progress.listArtifacts(this.cfg.type).slice(0, 5);

    host.textContent = "";
    if (!items.length) {
      var p = document.createElement("p");
      p.className = "text-dim";
      p.style.fontSize = "var(--fs-md)";
      p.textContent = "Nothing saved yet. Drafts autosave as you type.";
      host.appendChild(p);
      return;
    }

    var ul = document.createElement("ul");
    ul.className = "lab-checklist";
    items.forEach(function (a) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lab-checklist-btn";
      btn.setAttribute("data-testid", "recent-draft");
      btn.textContent = (a.id === self.currentId ? "● " : "○ ") + a.title;
      btn.addEventListener("click", function () {
        if (self.dirty) self.persist(true);
        self.currentId = a.id;
        self.cfg.apply(a.fields);
        self.status("Reopened “" + a.title + "”.");
        self.renderRecent();
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    host.appendChild(ul);

    var link = document.createElement("a");
    link.href = "portfolio.html";
    link.className = "btn btn-ghost btn-sm";
    link.style.marginTop = "10px";
    link.textContent = "All artifacts →";
    host.appendChild(link);
  };

  window.BuilderCore = BuilderCore;
})();
