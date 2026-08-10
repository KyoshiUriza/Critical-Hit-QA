/*
 * Code Review Gauntlet.
 *
 * Grades in both directions. Missing a real defect costs you; flagging clean
 * code as broken costs you too, because in a real review that is the more
 * annoying failure mode — and interviewers notice it. The decoys exist to make
 * "tick everything" a losing strategy.
 *
 * DOM is built with createElement/textContent throughout. The snippets are
 * code, which means they contain angle brackets and quotes; interpolating them
 * into innerHTML would be both an escaping bug and a poor look on a site that
 * teaches testing.
 */
(function () {
  "use strict";

  var EX = window.CODE_REVIEW_EXERCISES || [];
  var index = 0;
  var graded = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function byId(id) { return document.getElementById(id); }

  function current() { return EX[index]; }

  // Checkbox order is shuffled per render so the answers cannot be learned by
  // position — with a fixed order, the real defects sit in the same slots every
  // time and the exercise degrades into pattern-matching the layout.
  function shuffled(issues, seed) {
    var arr = issues.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      // Deterministic per exercise so a reload does not reshuffle mid-attempt.
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      var j = seed % (i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function render() {
    var ex = current();
    graded = false;

    byId("ex-position").textContent = "Exercise " + (index + 1) + " of " + EX.length;
    byId("ex-title").textContent = ex.title;
    byId("ex-difficulty").textContent = ex.difficulty.toUpperCase();
    byId("ex-difficulty").className = "tag difficulty-" +
      (ex.difficulty === "hard" ? "hard" : ex.difficulty === "medium" ? "medium" : "easy");
    byId("ex-brief").textContent = ex.brief;
    byId("ex-code").textContent = ex.code;

    var list = byId("issue-list");
    list.textContent = "";
    shuffled(ex.issues, ex.id.length * 7919).forEach(function (issue) {
      var row = el("li", "cr-issue");
      row.setAttribute("data-issue", issue.id);

      var label = el("label", "cr-issue-label");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.setAttribute("data-issue-box", issue.id);
      var body = el("div", "flex-1");
      body.appendChild(el("span", "cr-issue-text", issue.label));
      var why = el("div", "cr-why hidden");
      why.setAttribute("data-why", issue.id);
      body.appendChild(why);
      label.append(box, body);
      row.appendChild(label);
      list.appendChild(row);
    });

    byId("cr-verdict").className = "hidden";
    byId("cr-verdict").textContent = "";
    byId("fixed-wrap").className = "hidden";
    byId("grade-btn").disabled = false;
    byId("prev-btn").disabled = index === 0;
    byId("next-btn").disabled = index === EX.length - 1;
  }

  function grade() {
    if (graded) return;
    graded = true;
    var ex = current();

    var found = 0, missed = 0, wrong = 0, realTotal = 0;

    ex.issues.forEach(function (issue) {
      var box = document.querySelector('[data-issue-box="' + issue.id + '"]');
      var row = box.closest(".cr-issue");
      var ticked = box.checked;
      box.disabled = true;

      if (issue.present) realTotal++;

      if (issue.present && ticked) { found++; row.classList.add("cr-correct"); }
      else if (issue.present && !ticked) { missed++; row.classList.add("cr-missed"); }
      else if (!issue.present && ticked) { wrong++; row.classList.add("cr-false"); }
      else { row.classList.add("cr-ok"); }

      var why = document.querySelector('[data-why="' + issue.id + '"]');
      var prefix = issue.present
        ? (ticked ? "✓ Real defect — " : "✗ Missed — ")
        : (ticked ? "⚠ Not a defect here — " : "◦ Correctly left alone — ");
      why.textContent = prefix + issue.why;
      why.classList.remove("hidden");
    });

    var verdict = byId("cr-verdict");
    verdict.className = "panel " + (missed === 0 && wrong === 0 ? "panel-accent" : "panel-warn");
    verdict.textContent = "";

    var score = el("div", "cr-score", found + " of " + realTotal + " defects found");
    verdict.appendChild(score);

    var line = el("p", "m-0");
    if (missed === 0 && wrong === 0) {
      line.textContent = "Clean review. You found every real defect and did not flag anything that was fine — which is the half candidates usually lose.";
    } else if (wrong > 0 && missed === 0) {
      line.textContent = "You caught everything real, but flagged " + wrong +
        " thing" + (wrong === 1 ? "" : "s") + " that was not a defect. In a real review that costs credibility: the author starts discounting your comments.";
    } else if (missed > 0 && wrong === 0) {
      line.textContent = "Nothing you raised was wrong, but " + missed +
        " real defect" + (missed === 1 ? "" : "s") + " got through. Read the notes below — the missed ones are the ones that reach production.";
    } else {
      line.textContent = "You missed " + missed + " real defect" + (missed === 1 ? "" : "s") +
        " and flagged " + wrong + " non-issue" + (wrong === 1 ? "" : "s") + ". Both directions matter; the notes below say why for each.";
    }
    verdict.appendChild(line);

    byId("fixed-code").textContent = ex.fixed;
    byId("fixed-wrap").className = "";
    byId("grade-btn").disabled = true;

    // Scored on BOTH directions, because the page claims over-flagging costs
    // you and a score that ignored it would make that claim false. Wrongly
    // flagged items are added to the denominator, so ticking every box gets
    // every real defect and still scores badly — which is the lesson.
    //
    //   found / (realTotal + wrong)
    //
    // Getting this wrong once already: the first version recorded
    // found/realTotal, so "tick everything" banked full marks while the
    // verdict text told the user off. The prose and the number now agree.
    if (window.Progress && window.Progress.recordQuizRun) {
      window.Progress.recordQuizRun({
        category: "automation",
        correct: found,
        total: realTotal + wrong,
        elapsedMs: 0
      });
    }
  }

  function move(delta) {
    var next = index + delta;
    if (next < 0 || next >= EX.length) return;
    index = next;
    render();
    byId("ex-title").scrollIntoView({ block: "center" });
  }

  // If the data file fails to load, the page previously rendered a blank title,
  // a blank code block, an empty checklist and an enabled Submit button — a
  // broken page pretending to be an exercise. Say what happened instead.
  if (!EX.length) {
    var brief = byId("ex-brief");
    if (brief) {
      byId("ex-title").textContent = "Exercises could not be loaded";
      brief.textContent =
        "The exercise data did not load. Reload the page; if it keeps happening, " +
        "the file js/data/code-review-exercises.js is not being served.";
      byId("grade-btn").disabled = true;
      byId("prev-btn").disabled = true;
      byId("next-btn").disabled = true;
    }
    return;
  }

  byId("grade-btn").addEventListener("click", grade);
  byId("prev-btn").addEventListener("click", function () { move(-1); });
  byId("next-btn").addEventListener("click", function () { move(1); });
  render();
})();
