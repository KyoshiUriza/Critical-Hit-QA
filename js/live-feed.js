/*
 * Live Feed (buggy build) — async and races.
 *
 * There is no network here: connect-src is 'none' sitewide. Every "request"
 * is a setTimeout with a deliberately uneven delay, which is enough to
 * reproduce every race in this file — races are about ORDERING, and ordering
 * is what a timer gives you. Using real requests would add flake without
 * adding a single new lesson.
 *
 * The delays are fixed per call rather than random, so a defect that
 * reproduces for you reproduces for the person you report it to. Randomness
 * here would make the exercise unreproducible, which is the opposite of what
 * it is teaching.
 */
(function () {
  "use strict";

  var SEED = [
    { id: "p1", author: "ops", text: "Deploy 4.12 finished — all regions green." },
    { id: "p2", author: "sam", text: "Anyone else seeing slow search on staging?" },
    { id: "p3", author: "ops", text: "Certificate for api.internal renews on Friday." }
  ];

  // Search is the classic stale-response race: the SHORTER query is slower,
  // so it lands last and overwrites the results for what you actually typed.
  var SEARCH_DELAY = function (q) { return Math.max(80, 700 - q.length * 200); };

  var posts = [];
  var unread = 0;
  var pending = 0;
  var postSeq = 0;
  var saveSeq = 0;

  function el(id) { return document.getElementById(id); }
  function trigger(id) { if (window.Detector) window.Detector.trigger(id); }
  function later(ms, fn) { return setTimeout(fn, ms); }

  function renderFeed() {
    var list = el("feed");
    list.innerHTML = "";
    posts.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "rl-row";
      row.setAttribute("data-testid", "post");
      row.setAttribute("data-post-id", p.id);

      var body = document.createElement("div");
      var who = document.createElement("strong");
      who.textContent = p.author;
      var txt = document.createElement("div");
      txt.className = "text-dim";
      txt.setAttribute("data-testid", "post-text");
      txt.textContent = p.text;
      var st = document.createElement("div");
      st.className = "text-dim text-sm";
      st.setAttribute("data-testid", "post-status");
      st.textContent = p.status || "";
      body.append(who, txt, st);
      row.appendChild(body);
      list.appendChild(row);
    });

    el("post-count").textContent = posts.length + " posts";
    el("unread").textContent = unread + " unread";

    // DEFECT (duplicate-append): two ids the same means the same item landed
    // twice. Surfaced the moment it happens, because a duplicate in a feed is
    // observable without any tooling.
    var ids = posts.map(function (p) { return p.id; });
    if (new Set(ids).size !== ids.length) trigger("duplicate-append");
  }

  // ── Posting ──────────────────────────────────────────────────────────
  // DEFECT (double-submit): the button is never disabled while a post is in
  // flight, and nothing de-duplicates. Two clicks inside the window make two
  // posts. This is the single most common async defect in real products.
  function submit() {
    var text = el("composer").value.trim();
    if (!text) { el("compose-error").textContent = "Write something first."; return; }
    el("compose-error").textContent = "";

    postSeq += 1;
    var id = "new" + postSeq;
    var mine = { id: id, author: "you", text: text, status: "Sending…" };

    // Optimistic: it appears immediately, before anything has succeeded.
    posts.unshift(mine);
    renderFeed();

    saveSeq += 1;
    var thisSave = saveSeq;
    // Every third save "fails".
    var willFail = thisSave % 3 === 0;

    later(600, function () {
      // DEFECT (optimistic-no-rollback): on failure the post stays on screen
      // and is labeled Sent anyway. The log says the save was rejected; the
      // row says it went out. Reload and it is gone — the user believes they
      // said something they did not. The contradiction is what to notice; the
      // log does not name it for you.
      mine.status = "Sent";
      renderFeed();
      el("save-log").textContent = willFail
        ? "POST /posts → 400 Rejected  (save #" + thisSave + ")"
        : "POST /posts → 201 Created  (save #" + thisSave + ")";
      if (willFail) trigger("optimistic-no-rollback");

      // Cleared on success, which is why a second click inside the 600ms
      // window still has the text to send. That window is the defect.
      el("composer").value = "";
    });

    // Two posts by you with identical text means the double-submit window was
    // hit. Observable: the feed visibly shows the message twice.
    var sameText = posts.filter(function (p) {
      return p.author === "you" && p.text === text;
    });
    if (sameText.length > 1) trigger("double-submit");
  }

  // ── Search ───────────────────────────────────────────────────────────
  // DEFECT (stale-response): no request id, no cancellation. The response
  // that arrives last wins, and here the shorter query is the slower one.
  function search(q) {
    var delay = SEARCH_DELAY(q);
    pending += 1;
    el("search-status").textContent = pending + " in flight";

    later(delay, function () {
      pending -= 1;
      var hits = SEED.concat(posts).filter(function (p) {
        return q && p.text.toLowerCase().indexOf(q.toLowerCase()) !== -1;
      });

      var box = el("results");
      box.innerHTML = "";
      box.setAttribute("data-for-query", q);
      hits.forEach(function (p) {
        var d = document.createElement("div");
        d.className = "text-dim text-sm";
        d.setAttribute("data-testid", "result");
        d.textContent = p.text;
        box.appendChild(d);
      });
      el("result-count").textContent = hits.length + " results for “" + q + "”";
      el("search-status").textContent = pending + " in flight";

      // Observable the moment the label disagrees with the input.
      if (q !== el("search").value) trigger("stale-response");
    });
  }

  // ── Background refresh ───────────────────────────────────────────────
  // DEFECT (lost-update): the refresh rebuilds the composer's contents from
  // the server's idea of the draft, clobbering whatever the user has typed
  // since. Nothing checks whether the field is dirty.
  function refresh() {
    el("refresh-status").textContent = "refreshing…";
    later(500, function () {
      // DEFECT (duplicate-append): merged by push, not by id. A second refresh
      // started before the first returned appends the same rows again.
      SEED.forEach(function (p) { posts.push({ id: p.id, author: p.author, text: p.text }); });

      var typed = el("composer").value;
      el("composer").value = "";
      if (typed) {
        trigger("lost-update");
        el("refresh-status").textContent = "refreshed — your draft was replaced";
      } else {
        el("refresh-status").textContent = "refreshed";
      }
      renderFeed();
    });
  }

  // ── Unread counter ───────────────────────────────────────────────────
  // DEFECT (counter-race): the count is read into a local, then written back
  // after an await-shaped delay. Two arrivals inside that window both read the
  // same starting value and one increment is lost.
  var expected = 0;

  function arrive(n) {
    expected += n;
    for (var i = 0; i < n; i++) {
      (function (k) {
        // Read now, write later. Every arrival in this batch reads the same
        // starting value, so n increments collapse into one.
        var readAt = unread;
        later(120 + k * 5, function () {
          unread = readAt + 1;
          renderFeed();
          if (unread < expected) trigger("counter-race");
        });
      })(i);
    }
  }

  function init() {
    posts = SEED.map(function (p) { return { id: p.id, author: p.author, text: p.text }; });
    renderFeed();

    el("send").addEventListener("click", submit);
    el("refresh").addEventListener("click", refresh);
    el("simulate").addEventListener("click", function () { arrive(3); });

    el("search").addEventListener("input", function () {
      var q = el("search").value.trim();
      if (q) search(q);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
