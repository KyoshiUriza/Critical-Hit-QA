// Severity & priority calibration drill.
//
// Grading is deliberately band-tolerant. Calibration is a defensible judgment
// and two good testers will disagree by a band on half of these; a drill that
// marks one band out as WRONG teaches learners to guess the author's opinion
// rather than to reason. What it does mark is being TWO bands out, which is
// not a difference of opinion, and it reports directional bias, which is the
// feedback nobody gets on the job.
(function () {
  var SEV = ["low", "medium", "high", "critical"];
  var PRI = ["P3", "P2", "P1", "P0"];
  var SEV_LABEL = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

  var state = { i: 0, answers: [] };

  function el(id) { return document.getElementById(id); }
  function dist(scale, a, b) { return scale.indexOf(a) - scale.indexOf(b); }

  function options(scale, labels) {
    return scale.slice().reverse().map(function (v) {
      return '<option value="' + v + '">' + (labels ? labels[v] : v) + "</option>";
    }).join("");
  }

  function render() {
    var s = window.SEVERITY_SCENARIOS[state.i];
    if (!s) return renderReport();

    el("drill-position").textContent =
      "Scenario " + (state.i + 1) + " of " + window.SEVERITY_SCENARIOS.length;
    el("drill-progress").style.width =
      Math.round((state.i / window.SEVERITY_SCENARIOS.length) * 100) + "%";

    el("drill-card").innerHTML =
      '<h3 data-testid="scenario-title">' + s.title + "</h3>" +
      '<p class="text-dim" data-testid="scenario-context">' + s.context + "</p>" +
      '<div class="two-col">' +
        '<div class="form-field"><label for="pick-severity">Severity — technical impact</label>' +
          '<select id="pick-severity" data-testid="pick-severity">' +
          '<option value="">Choose…</option>' + options(SEV, SEV_LABEL) + "</select></div>" +
        '<div class="form-field"><label for="pick-priority">Priority — fix order</label>' +
          '<select id="pick-priority" data-testid="pick-priority">' +
          '<option value="">Choose…</option>' + options(PRI) + "</select></div>" +
      "</div>" +
      '<button class="btn btn-primary" id="commit" data-testid="commit">Commit my call</button>' +
      '<div id="verdict" data-testid="verdict"></div>';

    el("commit").addEventListener("click", grade);
  }

  function grade() {
    var s = window.SEVERITY_SCENARIOS[state.i];
    var sev = el("pick-severity").value;
    var pri = el("pick-priority").value;

    if (!sev || !pri) {
      el("verdict").innerHTML =
        '<div class="panel panel-warn">Commit to both before you look. ' +
        "Reading the answer first feels like learning and is not — the whole " +
        "value here is finding out where your instinct sits.</div>";
      return;
    }

    var ds = dist(SEV, sev, s.severity);
    var dp = dist(PRI, pri, s.priority);
    var worst = Math.max(Math.abs(ds), Math.abs(dp));
    var verdict = worst === 0 ? "match" : worst === 1 ? "close" : "off";

    state.answers.push({ id: s.id, sev: sev, pri: pri, ds: ds, dp: dp, verdict: verdict });

    var head = verdict === "match"
      ? "<strong>Same call.</strong>"
      : verdict === "close"
        ? "<strong>One band apart — defensible.</strong> Two good testers " +
          "disagree here regularly. What matters is whether you can argue it."
        : "<strong>Two bands apart.</strong> That is not a difference of " +
          "opinion, so the reasoning below is worth reading slowly.";

    el("verdict").innerHTML =
      '<div class="panel ' + (verdict === "off" ? "panel-danger" : "panel-accent") + '">' +
        "<p>" + head + "</p>" +
        '<p data-testid="model-answer">Model answer: <strong>' + SEV_LABEL[s.severity] +
          " severity, " + s.priority + "</strong>. You said " + SEV_LABEL[sev] +
          ", " + pri + ".</p>" +
        "<p>" + s.why + "</p>" +
        '<p class="text-dim"><strong>What would change it:</strong> ' + s.changes + "</p>" +
        '<button class="btn btn-primary btn-sm" id="next" data-testid="next">' +
          (state.i + 1 < window.SEVERITY_SCENARIOS.length ? "Next scenario →" : "See my calibration →") +
        "</button>" +
      "</div>";

    el("pick-severity").disabled = true;
    el("pick-priority").disabled = true;
    el("commit").disabled = true;
    el("next").addEventListener("click", function () { state.i++; render(); });
  }

  // Directional bias is the finding a learner cannot get anywhere else. Being
  // consistently one band high is not a knowledge gap — it is a habit, and it
  // is the habit that gets a tester's reports discounted by developers.
  function bias(values) {
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    if (mean >= 0.6) return "high";
    if (mean <= -0.6) return "low";
    return "even";
  }

  function renderReport() {
    var a = state.answers;
    var matched = a.filter(function (x) { return x.verdict === "match"; }).length;
    var close = a.filter(function (x) { return x.verdict === "close"; }).length;
    var off = a.filter(function (x) { return x.verdict === "off"; }).length;

    var sevBias = bias(a.map(function (x) { return x.ds; }));
    var priBias = bias(a.map(function (x) { return x.dp; }));

    var notes = [];
    if (sevBias === "high") {
      notes.push("You rate severity higher than the model answer more often " +
        "than not. This is the most common pattern in new testers and it is " +
        "expensive: a queue where everything is critical is a queue with no " +
        "signal, and the cost lands on the day something genuinely is.");
    } else if (sevBias === "low") {
      notes.push("You rate severity lower than the model answer more often " +
        "than not. Under-rating reads as good judgment right up to the " +
        "security or data-integrity defect that gets triaged into next " +
        "quarter because your report made it sound survivable.");
    } else {
      notes.push("Your severity calls sit close to the model answers in both " +
        "directions, which is what calibrated looks like — not agreeing every " +
        "time, but not leaning.");
    }

    if (priBias === "high") {
      notes.push("You also push priority up. Priority is the business's call " +
        "more than yours; the useful move is to supply the evidence — how " +
        "many users, how often, what the workaround costs — and let it be " +
        "argued from that.");
    } else if (priBias === "low") {
      notes.push("You push priority down. Deferring is usually right, but " +
        "state it: a report that names the workaround and its cost is a " +
        "deferral the team agreed to rather than one they discovered later.");
    }

    if (off === 0) {
      notes.push("Nothing was two bands out, which is the bar that matters. " +
        "One band is a conversation; two is a report someone else has to fix " +
        "before it can be triaged.");
    }

    el("drill-position").textContent = "Complete";
    el("drill-progress").style.width = "100%";
    el("drill-card").innerHTML =
      '<h3>Your calibration</h3>' +
      '<p data-testid="drill-score">' + matched + " same call, " + close +
        " one band apart, " + off + " two or more apart, out of " + a.length + ".</p>" +
      '<div class="panel panel-accent" data-testid="drill-bias">' +
        notes.map(function (n) { return "<p>" + n + "</p>"; }).join("") +
      "</div>" +
      '<p class="text-dim">These are model answers, not facts. If you can ' +
        "state the impact, the audience, the frequency and the workaround, a " +
        "defensible disagreement with any of them is a better outcome than " +
        "matching all ten.</p>" +
      '<button class="btn btn-primary" id="again" data-testid="again">Run it again</button>';

    // "Close" counts toward the score. Marking a one-band disagreement as a
    // miss would penalise exactly the judgment this is trying to build.
    if (window.Progress && window.Progress.recordQuizRun) {
      window.Progress.recordQuizRun({
        category: "manual", correct: matched + close, total: a.length, elapsedMs: 0
      });
    }

    el("again").addEventListener("click", function () {
      state = { i: 0, answers: [] };
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", render);
})();
