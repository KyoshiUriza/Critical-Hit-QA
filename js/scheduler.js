/*
 * Scheduler (buggy build) — timezone and DST.
 *
 * Nothing here is faked. Conversions go through Intl.DateTimeFormat with a
 * real IANA zone, so the spring-forward gap and the fall-back ambiguity are
 * produced by the platform's own tz database rather than by a lookup table
 * written to make the exercise work. That matters: a learner who tries these
 * dates against any other tool will get the same answers.
 *
 * The seeded defect is the one real schedulers ship: events are stored as a
 * naive wall-clock string with no zone attached, and every downstream
 * calculation inherits that ambiguity.
 */
(function () {
  "use strict";

  var ZONES = [
    "UTC",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
    "Asia/Tokyo",
    "Australia/Sydney"
  ];

  // 2026 US transitions: forward 08 Mar (02:00 -> 03:00), back 01 Nov
  // (02:00 -> 01:00). Europe/London switches on different dates, which is
  // itself worth noticing — the gap is not the same weekend everywhere.
  var PRESETS = [
    { id: "spring", label: "Spring forward — 8 Mar 2026", date: "2026-03-08", time: "02:30" },
    { id: "fall", label: "Fall back — 1 Nov 2026", date: "2026-11-01", time: "01:30" },
    { id: "ordinary", label: "An ordinary day — 15 Jun 2026", date: "2026-06-15", time: "09:00" }
  ];

  var events = [];
  var viewerTz = "America/New_York";

  function el(id) { return document.getElementById(id); }
  function trigger(id) { if (window.Detector) window.Detector.trigger(id); }

  // Offset of a zone at a given instant, in milliseconds.
  function tzOffset(date, tz) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var p = {};
    dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day,
      p.hour === "24" ? 0 : +p.hour, +p.minute, +p.second);
    return asUTC - date.getTime();
  }

  // "2026-03-08T02:30" in a zone -> the instant it refers to. In the
  // spring-forward gap that wall-clock time does not exist, so this resolves
  // to a DIFFERENT wall-clock time. The app does not notice; that is defect
  // one, and it is the platform telling the truth, not a trick.
  function zonedToUtc(naive, tz) {
    var guess = new Date(naive + ":00Z");
    var off = tzOffset(guess, tz);
    var d = new Date(guess.getTime() - off);
    var off2 = tzOffset(d, tz);
    if (off2 !== off) d = new Date(guess.getTime() - off2);
    return d;
  }

  function fmt(date, tz, opts) {
    return new Intl.DateTimeFormat("en-GB", Object.assign({
      timeZone: tz, year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: true
    }, opts || {})).format(date);
  }

  // Two time formatters on purpose. fmtTimeOnly is zero-padded and is used
  // for internal comparisons — it must line up with to12h. fmtDisplay uses a
  // numeric hour, which is what the agenda shows and what the broken sort
  // compares. With zero padding the string sort would accidentally be
  // correct, and the seeded defect would not exist.
  function fmtTimeOnly(date, tz) {
    return fmt(date, tz, { year: undefined, month: undefined, day: undefined });
  }

  function fmtDisplay(date, tz) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, year: "numeric", month: "short", day: "2-digit",
      hour: "numeric", minute: "2-digit", hour12: true
    }).format(date);
  }

  function fmtDisplayTime(date, tz) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true
    }).format(date);
  }

  function dayOnly(date, tz) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(date);
  }

  function render() {
    var list = el("agenda");
    list.innerHTML = "";

    if (!events.length) {
      list.innerHTML = '<p class="text-dim" data-testid="agenda-empty">' +
        "No events yet. Add one, or use a preset — the two DST dates are the " +
        "interesting ones.</p>";
      el("tz-evidence").textContent = "";
      return;
    }

    // DEFECT (sort-lexicographic): the agenda sorts on the formatted time
    // string, so "10:00 am" sorts before "9:00 am". Sorting display strings
    // instead of the underlying values is a defect that survives review
    // because the code reads like it is doing the right thing.
    var ordered = events.slice().sort(function (a, b) {
      return fmtDisplayTime(instantOf(a), viewerTz).localeCompare(fmtDisplayTime(instantOf(b), viewerTz));
    });

    var trueOrder = events.slice().sort(function (a, b) {
      return instantOf(a) - instantOf(b);
    });
    if (ordered.length > 1 && ordered.some(function (e, i) { return e !== trueOrder[i]; })) {
      trigger("sort-lexicographic");
    }

    ordered.forEach(function (ev, i) {
      list.appendChild(row(ev, i));
    });
  }

  function instantOf(ev) {
    if (ev.allDay) {
      // DEFECT (allday-shift): an all-day event has no time and no zone, and
      // storing it as UTC midnight gives it both. West of UTC it renders on
      // the previous day.
      return new Date(ev.date + "T00:00:00Z");
    }
    return zonedToUtc(ev.date + "T" + ev.time, viewerTz);
  }

  function row(ev, i) {
    var wrap = document.createElement("div");
    wrap.className = "rl-row";
    wrap.setAttribute("data-testid", "event-row");
    wrap.setAttribute("data-event-id", ev.id);

    var start = instantOf(ev);
    var body = document.createElement("div");

    var title = document.createElement("strong");
    title.textContent = ev.title;
    body.appendChild(title);

    var lines = [];

    if (ev.allDay) {
      var shown = dayOnly(start, viewerTz);
      lines.push(["As entered", ev.date + " (all day)"]);
      lines.push(["Shown to you", shown]);
      if (shown !== ev.date) trigger("allday-shift");
    } else {
      // DEFECT (dst-spring-gap / dst-fall-duplicate): what you typed and what
      // the app resolved are shown side by side, because that contradiction is
      // the whole exercise. A real product would show only the second.
      var resolved = fmtTimeOnly(start, viewerTz).toLowerCase().replace(/\s/g, "");
      var entered = to12h(ev.time);
      lines.push(["As entered", ev.date + " " + ev.time]);
      lines.push(["Stored instant (UTC)", start.toISOString()]);
      lines.push(["Shown to you", fmtDisplay(start, viewerTz)]);

      if (resolved !== entered) trigger("dst-spring-gap");

      // DEFECT (duration-across-dst): the end time is the start's WALL CLOCK
      // plus the duration, so an hour that repeats or vanishes is not counted.
      var naiveEnd = addMinutesNaive(ev.date, ev.time, ev.durationMin);
      var endInstant = zonedToUtc(naiveEnd.date + "T" + naiveEnd.time, viewerTz);
      var actualMin = Math.round((endInstant - start) / 60000);
      lines.push(["Ends", naiveEnd.date + " " + naiveEnd.time +
        "  ·  booked " + ev.durationMin + " min, actually " + actualMin + " min"]);
      if (actualMin !== ev.durationMin) trigger("duration-across-dst");

      // The ambiguous hour: two distinct instants share this wall clock.
      if (isAmbiguous(ev.date, ev.time, viewerTz)) trigger("dst-fall-duplicate");
    }

    lines.forEach(function (pair) {
      var p = document.createElement("div");
      p.className = "text-dim text-sm";
      p.setAttribute("data-line", pair[0].toLowerCase().replace(/[^a-z]+/g, "-"));
      p.textContent = pair[0] + ": " + pair[1];
      body.appendChild(p);
    });

    var del = document.createElement("button");
    del.className = "btn btn-ghost btn-sm";
    del.textContent = "Remove";
    del.setAttribute("data-testid", "remove-event-" + i);
    del.addEventListener("click", function () {
      events = events.filter(function (e) { return e.id !== ev.id; });
      render();
    });

    wrap.append(body, del);
    return wrap;
  }

  function to12h(hhmm) {
    var h = +hhmm.slice(0, 2), m = hhmm.slice(3);
    var ap = h >= 12 ? "pm" : "am";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return (h12 < 10 ? "0" : "") + h12 + ":" + m + ap;
  }

  function addMinutesNaive(date, time, mins) {
    var d = new Date(date + "T" + time + ":00Z");
    d = new Date(d.getTime() + mins * 60000);
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
  }

  // A wall clock is ambiguous when the instant one hour LATER formats to the
  // same wall clock — that is the fall-back repeat. Later, not earlier:
  // zonedToUtc resolves 01:30 on 1 Nov to the first (EDT) occurrence at
  // 05:30Z, and the duplicate is the EST one at 06:30Z.
  function isAmbiguous(date, time, tz) {
    var a = zonedToUtc(date + "T" + time, tz);
    var later = new Date(a.getTime() + 3600000);
    return fmtTimeOnly(later, tz) === fmtTimeOnly(a, tz);
  }

  function add(title, date, time, durationMin, allDay) {
    events.push({
      id: "ev" + (events.length + 1) + "-" + date + "-" + time,
      title: title, date: date, time: time,
      durationMin: durationMin, allDay: allDay
    });
    render();
  }

  function init() {
    var sel = el("viewer-tz");
    ZONES.forEach(function (z) {
      var o = document.createElement("option");
      o.value = z; o.textContent = z;
      sel.appendChild(o);
    });
    sel.value = viewerTz;

    sel.addEventListener("change", function () {
      var before = events.length
        ? events.map(function (e) { return e.allDay ? "" : fmtTimeOnly(instantOf(e), viewerTz); }).join("|")
        : null;
      viewerTz = sel.value;
      var after = events.length
        ? events.map(function (e) { return e.allDay ? "" : fmtTimeOnly(instantOf(e), viewerTz); }).join("|")
        : null;

      // DEFECT (naive-local-store): the spec says an event is scheduled in the
      // organiser's zone, so a viewer elsewhere should see it converted. The
      // stored value is a bare wall clock, so it never converts — the time is
      // identical in Tokyo and Los Angeles. Recorded only once the learner has
      // actually run the comparison, because that is when it is observable.
      if (before !== null && before === after && before !== "") {
        trigger("naive-local-store");
        el("tz-evidence").textContent =
          "Timezone changed to " + viewerTz + " — every timed event still reads the same.";
      } else {
        el("tz-evidence").textContent = "";
      }
      render();
    });

    var presets = el("presets");
    PRESETS.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "btn btn-sm";
      b.textContent = p.label;
      b.setAttribute("data-testid", "preset-" + p.id);
      b.addEventListener("click", function () {
        el("ev-date").value = p.date;
        el("ev-time").value = p.time;
      });
      presets.appendChild(b);
    });

    el("add-event").addEventListener("click", function () {
      var title = el("ev-title").value.trim() || "Untitled event";
      var date = el("ev-date").value;
      var time = el("ev-time").value || "09:00";
      var mins = parseInt(el("ev-duration").value, 10) || 60;
      if (!date) { el("ev-error").textContent = "Pick a date first."; return; }
      el("ev-error").textContent = "";
      add(title, date, time, mins, el("ev-allday").checked);
      el("ev-title").value = "";
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);

  // Exposed so the suite can assert the conversion maths directly rather than
  // only through the DOM — these are the functions the defects live in.
  window.SchedulerInternals = { zonedToUtc: zonedToUtc, tzOffset: tzOffset, isAmbiguous: isAmbiguous };
})();
