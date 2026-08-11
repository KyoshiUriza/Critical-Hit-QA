/*
 * Backup and restore — one implementation, used by both the Progress page and
 * the Account page.
 *
 * ADR 0002 established the principle this file exists to keep: "two validators
 * for one data shape is one validator and one liability". The same is true of
 * the transport. Before this, the Progress page had its own inline copy, and
 * it had drifted in two ways that mattered:
 *
 *   1. "Export as JSON" printed the blob into a <pre> on the page. There was
 *      no file. The one thing an export is for — carrying progress to another
 *      device — it did not do, and the button's label said otherwise.
 *
 *   2. Import wrote to the hard-coded key "qaprep_progress_v1" rather than to
 *      the active profile. Restoring a backup while on a second profile
 *      silently overwrote the FIRST profile's progress and left the profile
 *      you were looking at untouched. Two ways wrong at once.
 *
 * Validation still lives in js/progress-schema.js. This module moves bytes and
 * chooses the destination; it does not decide what is valid.
 */
(function () {
  "use strict";

  function activeKey() {
    return window.Profiles ? window.Profiles.storageKey() : "qaprep_progress_v1";
  }

  function profileName() {
    if (!window.Profiles) return "progress";
    try {
      return window.Profiles.active().name || "progress";
    } catch (_) {
      return "progress";
    }
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "progress";
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  var Backup = {
    /* Named so a folder of these is still readable a year later: which
       profile, and when. */
    filename: function () {
      return "critical-hit-qa-" + slug(profileName()) + "-" + today() + ".json";
    },

    payload: function () {
      return JSON.stringify(window.Progress.get(), null, 2);
    },

    /* A real file. Blob + object URL rather than a data: URI, because a
       hundred saved drafts is about 150 KB and data: URIs of that size are
       awkward in several browsers. The object URL is revoked straight after —
       leaking one per click would pin the whole blob in memory. */
    download: function () {
      var name = Backup.filename();
      var blob = new Blob([Backup.payload()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 0);
      return name;
    },

    /* Resolves with the number of artifacts restored, or rejects with a
       message fit to show a user. */
    restoreFromText: function (text) {
      return new Promise(function (resolve, reject) {
        var parsed;
        try {
          parsed = JSON.parse(text);
        } catch (_) {
          reject(new Error("That file is not valid JSON."));
          return;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("That file does not look like a progress backup."));
          return;
        }
        var clean;
        try {
          clean = window.ProgressSchema.sanitize(parsed);
        } catch (err) {
          reject(new Error("That file could not be validated: " + err.message));
          return;
        }
        // The active profile, not the first one.
        localStorage.setItem(activeKey(), JSON.stringify(clean));
        resolve({
          artifacts: (clean.artifacts || []).length,
          profile: profileName()
        });
      });
    },

    readFile: function (file) {
      return new Promise(function (resolve, reject) {
        if (!file) { reject(new Error("No file was chosen.")); return; }
        if (file.size > 5 * 1024 * 1024) {
          reject(new Error("That file is far larger than any backup this site produces."));
          return;
        }
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error("That file could not be read.")); };
        reader.onload = function () {
          Backup.restoreFromText(String(reader.result)).then(resolve, reject);
        };
        reader.readAsText(file);
      });
    },

    /* Drag and drop, because "move this to another device" ends in a file
       manager and dropping it is the obvious gesture. Keyboard and click
       still work through the file input — this is an addition, not a
       replacement, since a drop target alone is unreachable by keyboard. */
    wireDropZone: function (zone, onResult) {
      if (!zone) return;
      ["dragenter", "dragover"].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault();
          zone.setAttribute("data-dragging", "true");
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        zone.addEventListener(ev, function () { zone.removeAttribute("data-dragging"); });
      });
      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        Backup.readFile(file).then(
          function (r) { onResult(null, r); },
          function (err) { onResult(err); }
        );
      });
    }
  };

  window.Backup = Backup;
})();
