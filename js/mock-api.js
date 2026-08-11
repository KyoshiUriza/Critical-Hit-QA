/*
 * An in-page REST API.
 *
 * Why it exists: the Study Plan sent learners at API testing twice, and the
 * Automation Lab pointed them at a third-party sandbox. That breaks two of the
 * site's non-negotiables — offline, and connect-src 'none' — and if that host
 * rate-limits, Week 4 of the flagship plan dies silently.
 *
 * So this is a real request/response cycle with NO network involved. Nothing
 * here opens a socket: routes are matched and responses built in memory, which
 * is why the CSP can stay at connect-src 'none' while the page still teaches
 * status codes, error shapes, auth and idempotency.
 *
 * The trade-off, stated because a learner should know it: you are not
 * practicing HTTP itself — no DNS, no TLS, no real latency. You are practicing
 * the part interviews actually probe, which is what to assert and why.
 */
(function () {
  "use strict";

  var TOKEN = "qa-secret-token";

  function seed() {
    return {
      users: [
        { id: 1, name: "Ada Okonkwo", email: "ada@test.example", active: true },
        { id: 2, name: "Ben Iversen", email: "ben@test.example", active: true },
        // Deliberately inactive: gives ?active=false something real to return.
        { id: 3, name: "Chen Wei", email: "chen@test.example", active: false }
      ],
      orders: [
        { id: 101, userId: 1, total: 4250, status: "shipped" },
        { id: 102, userId: 2, total: 999, status: "pending" },
        // Orphan: userId 99 does not exist. The same trap as the SQL sandbox,
        // and the reason a tester checks referential integrity.
        { id: 103, userId: 99, total: 1500, status: "pending" }
      ],
      nextUserId: 4
    };
  }

  var db = seed();

  function json(status, body, extraHeaders) {
    var headers = {
      "content-type": "application/json",
      "x-request-id": "req-" + Math.random().toString(36).slice(2, 10)
    };
    Object.keys(extraHeaders || {}).forEach(function (k) { headers[k] = extraHeaders[k]; });
    return { status: status, headers: headers, body: body };
  }

  // A single error shape everywhere. An API that invents a new one per
  // endpoint is a real-world defect, and asserting on the shape is a real
  // interview answer.
  function error(status, code, message, field) {
    var body = { error: { code: code, message: message } };
    if (field) body.error.field = field;
    return json(status, body);
  }

  function findUser(id) {
    return db.users.filter(function (u) { return u.id === id; })[0] || null;
  }

  var ROUTES = [
    {
      method: "GET", pattern: /^\/users$/,
      handle: function (req) {
        var list = db.users.slice();
        var active = req.query.active;
        if (active === "true") list = list.filter(function (u) { return u.active; });
        if (active === "false") list = list.filter(function (u) { return !u.active; });
        return json(200, { data: list, count: list.length });
      }
    },
    {
      method: "GET", pattern: /^\/users\/(\d+)$/,
      handle: function (req, m) {
        var u = findUser(Number(m[1]));
        // 404 for a well-formed id that does not exist — distinct from a 400
        // for an id that is not a number at all.
        if (!u) return error(404, "not_found", "No user with id " + m[1] + ".");
        return json(200, { data: u });
      }
    },
    {
      method: "POST", pattern: /^\/users$/,
      handle: function (req) {
        var b = req.body || {};
        if (!b.name) return error(422, "validation_error", "name is required.", "name");
        if (!b.email) return error(422, "validation_error", "email is required.", "email");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
          return error(422, "validation_error", "email is not a valid address.", "email");
        }
        if (db.users.some(function (u) { return u.email.toLowerCase() === b.email.toLowerCase(); })) {
          // 409, not 422: the request is valid, it conflicts with state.
          return error(409, "conflict", "That email is already registered.", "email");
        }
        var user = { id: db.nextUserId++, name: b.name, email: b.email, active: true };
        db.users.push(user);
        // 201 plus Location — the pair candidates most often miss.
        return json(201, { data: user }, { location: "/users/" + user.id });
      }
    },
    {
      method: "PUT", pattern: /^\/users\/(\d+)$/,
      handle: function (req, m) {
        var u = findUser(Number(m[1]));
        if (!u) return error(404, "not_found", "No user with id " + m[1] + ".");
        var b = req.body || {};
        if (!b.name) return error(422, "validation_error", "name is required.", "name");
        // Idempotent by construction: sending this twice leaves one user with
        // the same values, which is the property worth asserting.
        u.name = b.name;
        if (b.email) u.email = b.email;
        if (typeof b.active === "boolean") u.active = b.active;
        return json(200, { data: u });
      }
    },
    {
      method: "DELETE", pattern: /^\/users\/(\d+)$/,
      handle: function (req, m) {
        var id = Number(m[1]);
        var before = db.users.length;
        db.users = db.users.filter(function (u) { return u.id !== id; });
        // A second DELETE returns 404, not 204. Both are defensible designs;
        // what matters is that the API picks one and the test knows which.
        if (db.users.length === before) return error(404, "not_found", "No user with id " + id + ".");
        return { status: 204, headers: { "x-request-id": "req-" + Math.random().toString(36).slice(2, 10) }, body: null };
      }
    },
    {
      method: "GET", pattern: /^\/orders$/,
      requiresAuth: true,
      handle: function () {
        return json(200, { data: db.orders, count: db.orders.length });
      }
    },
    {
      method: "GET", pattern: /^\/orders\/(\d+)$/,
      requiresAuth: true,
      handle: function (req, m) {
        var o = db.orders.filter(function (x) { return x.id === Number(m[1]); })[0];
        if (!o) return error(404, "not_found", "No order with id " + m[1] + ".");
        return json(200, { data: o, user: findUser(o.userId) });
      }
    }
  ];

  function parseQuery(qs) {
    var out = {};
    (qs || "").split("&").forEach(function (pair) {
      if (!pair) return;
      var bits = pair.split("=");
      out[decodeURIComponent(bits[0])] = decodeURIComponent(bits[1] || "");
    });
    return out;
  }

  var MockApi = {
    TOKEN: TOKEN,

    reset: function () { db = seed(); },

    /**
     * @param {string} method
     * @param {string} url   e.g. "/users/1?active=true"
     * @param {object} opts  { body, token }
     * @returns {object}     { status, headers, body }
     */
    request: function (method, url, opts) {
      opts = opts || {};
      var parts = String(url || "").split("?");
      var path = parts[0].replace(/\/+$/, "") || "/";
      var query = parseQuery(parts[1]);

      var pathMatched = false;
      for (var i = 0; i < ROUTES.length; i++) {
        var r = ROUTES[i];
        var m = r.pattern.exec(path);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== method) continue;

        if (r.requiresAuth && opts.token !== TOKEN) {
          // 401, not 403: the caller has not proved who they are. 403 would
          // mean "we know who you are and you still may not".
          return error(401, "unauthorized", "A valid bearer token is required.");
        }
        return r.handle({ query: query, body: opts.body }, m);
      }

      // A path that exists for another verb is 405, not 404 — the resource is
      // there, the method is not allowed on it.
      if (pathMatched) return error(405, "method_not_allowed", method + " is not allowed on " + path + ".");
      return error(404, "not_found", "No route for " + path + ".");
    }
  };

  window.MockApi = MockApi;
})();
