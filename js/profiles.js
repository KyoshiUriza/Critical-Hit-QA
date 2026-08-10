/*
 * Local profiles.
 *
 * This site is served as static files, so there is no server to hold an
 * account against. Rather than fake a login — which on a static site means
 * either storing a password where any script can read it, or theatre that
 * teaches the wrong lesson on a site about testing — profiles are local and
 * named, and progress travels by an explicit sync code the user controls.
 *
 * What that buys, honestly stated:
 *   - several people can share a browser without overwriting each other
 *   - progress survives a cleared profile if a code was saved
 *   - progress moves between devices by copying a code
 * What it does not buy: automatic sync. Moving devices is a deliberate act.
 *
 * Storage layout, chosen so nothing already saved is disturbed:
 *   qaprep_profiles_v1        registry + which profile is active
 *   qaprep_progress_v1        the default profile's data (the pre-existing key)
 *   qaprep_progress_v1:<id>   every other profile's data
 *
 * The default profile deliberately keeps the original key, so anyone who used
 * the site before profiles existed keeps their progress without a migration
 * step that could lose it.
 */
(function () {
  "use strict";

  var REGISTRY_KEY = "qaprep_profiles_v1";
  var BASE_DATA_KEY = "qaprep_progress_v1";
  var DEFAULT_ID = "default";
  var MAX_PROFILES = 6;
  var MAX_NAME = 24;

  // Bumped only if the payload shape changes in a way older readers cannot
  // handle. Present in the code itself so a mismatch is a clear error rather
  // than a confusing partial import.
  var CODE_VERSION = "CHQ1";

  function readRegistry() {
    var raw;
    try {
      raw = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "null");
    } catch (_) {
      raw = null;
    }
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.profiles) || !raw.profiles.length) {
      return {
        activeId: DEFAULT_ID,
        profiles: [{ id: DEFAULT_ID, name: "Tester", createdAt: Date.now() }]
      };
    }
    // Never trust storage more than a file — another script on this origin, or
    // the user's own console, can write anything here.
    var profiles = raw.profiles
      .filter(function (p) { return p && typeof p === "object" && typeof p.id === "string"; })
      .slice(0, MAX_PROFILES)
      .map(function (p) {
        return {
          id: /^[a-z0-9]{1,24}$/.test(p.id) ? p.id : DEFAULT_ID,
          name: (typeof p.name === "string" ? p.name : "Tester").slice(0, MAX_NAME) || "Tester",
          createdAt: typeof p.createdAt === "number" && isFinite(p.createdAt) ? p.createdAt : Date.now()
        };
      });
    if (!profiles.length) profiles = [{ id: DEFAULT_ID, name: "Tester", createdAt: Date.now() }];

    var activeId = profiles.some(function (p) { return p.id === raw.activeId; })
      ? raw.activeId
      : profiles[0].id;

    return { activeId: activeId, profiles: profiles };
  }

  function writeRegistry(reg) {
    try {
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
    } catch (_) {}
  }

  function dataKeyFor(id) {
    return id === DEFAULT_ID ? BASE_DATA_KEY : BASE_DATA_KEY + ":" + id;
  }

  function newProfileId() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  // ---- sync codes -------------------------------------------------------
  // A code is VERSION.payload.checksum, base64url so it survives being pasted
  // into a chat box, an email, or a URL without being mangled.

  function toBase64Url(text) {
    // unescape(encodeURIComponent(x)) is the standard trick for getting btoa
    // to accept non-Latin1 characters, which user prose certainly contains.
    var b64 = btoa(unescape(encodeURIComponent(text)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(code) {
    var b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return decodeURIComponent(escape(atob(b64)));
  }

  // Not a security control — it catches truncated or mis-pasted codes so the
  // user gets "that code looks incomplete" instead of a schema error. The
  // schema validator is what makes a hostile code safe.
  function checksum(text) {
    var h = 5381;
    for (var i = 0; i < text.length; i++) {
      h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  }

  var Profiles = {
    DEFAULT_ID: DEFAULT_ID,
    MAX_PROFILES: MAX_PROFILES,
    MAX_NAME: MAX_NAME,

    list: function () { return readRegistry().profiles; },

    active: function () {
      var reg = readRegistry();
      var found = reg.profiles.filter(function (p) { return p.id === reg.activeId; })[0];
      return found || reg.profiles[0];
    },

    // progress.js calls this on every read and write, so switching profiles
    // needs no reload and no cached handle to go stale.
    storageKey: function () { return dataKeyFor(this.active().id); },

    create: function (name) {
      var reg = readRegistry();
      if (reg.profiles.length >= MAX_PROFILES) {
        throw new Error("You can have at most " + MAX_PROFILES + " profiles in this browser.");
      }
      var clean = String(name || "").trim().slice(0, MAX_NAME);
      if (!clean) throw new Error("Give the profile a name.");
      if (reg.profiles.some(function (p) { return p.name.toLowerCase() === clean.toLowerCase(); })) {
        throw new Error("You already have a profile called that.");
      }
      var id = newProfileId();
      reg.profiles.push({ id: id, name: clean, createdAt: Date.now() });
      reg.activeId = id;
      writeRegistry(reg);
      return id;
    },

    rename: function (id, name) {
      var reg = readRegistry();
      var clean = String(name || "").trim().slice(0, MAX_NAME);
      if (!clean) throw new Error("Give the profile a name.");
      reg.profiles.forEach(function (p) { if (p.id === id) p.name = clean; });
      writeRegistry(reg);
    },

    switchTo: function (id) {
      var reg = readRegistry();
      if (!reg.profiles.some(function (p) { return p.id === id; })) return false;
      reg.activeId = id;
      writeRegistry(reg);
      return true;
    },

    remove: function (id) {
      var reg = readRegistry();
      if (reg.profiles.length <= 1) throw new Error("You need at least one profile.");
      reg.profiles = reg.profiles.filter(function (p) { return p.id !== id; });
      if (reg.activeId === id) reg.activeId = reg.profiles[0].id;
      writeRegistry(reg);
      try { localStorage.removeItem(dataKeyFor(id)); } catch (_) {}
    },

    // ---- codes ----

    exportCode: function () {
      var payload = {
        v: 1,
        name: this.active().name,
        savedAt: new Date().toISOString().slice(0, 10),
        data: window.Progress ? window.Progress.get() : {}
      };
      var body = toBase64Url(JSON.stringify(payload));
      return CODE_VERSION + "." + body + "." + checksum(body);
    },

    // Returns { name, savedAt, data } with data already schema-validated.
    // Throws with a message meant to be shown to a person.
    decodeCode: function (code) {
      var trimmed = String(code || "").trim().replace(/\s+/g, "");
      if (!trimmed) throw new Error("Paste a code first.");

      var parts = trimmed.split(".");
      if (parts.length !== 3) throw new Error("That doesn't look like a sync code — it should have three parts separated by dots.");
      if (parts[0] !== CODE_VERSION) throw new Error("That code was made by a different version of the site.");
      if (checksum(parts[1]) !== parts[2]) throw new Error("That code looks incomplete or was altered in copying. Copy the whole thing and try again.");

      var parsed;
      try {
        parsed = JSON.parse(fromBase64Url(parts[1]));
      } catch (_) {
        throw new Error("That code could not be read.");
      }
      if (!parsed || typeof parsed !== "object") throw new Error("That code could not be read.");

      if (!window.ProgressSchema) throw new Error("Validator not loaded — refresh the page.");

      return {
        name: (typeof parsed.name === "string" ? parsed.name : "").slice(0, MAX_NAME),
        savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt.slice(0, 10) : "",
        data: window.ProgressSchema.sanitize(parsed.data)
      };
    },

    // Writes validated data into the active profile. Deliberately separate
    // from decodeCode so the UI can show what a code contains and let the user
    // confirm before anything is overwritten.
    applyDecoded: function (decoded) {
      localStorage.setItem(this.storageKey(), JSON.stringify(decoded.data));
    },

    // Every key this module owns, for the test-reset hook.
    ownedKeys: function () {
      var keys = [REGISTRY_KEY];
      readRegistry().profiles.forEach(function (p) { keys.push(dataKeyFor(p.id)); });
      return keys;
    }
  };

  window.Profiles = Profiles;
})();
