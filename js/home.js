// Home page: live stats + a resume card for returning users.
(function () {
  "use strict";

  function renderStats() {
    const q = document.getElementById("stat-questions");
    const i = document.getElementById("stat-interview");
    if (q && window.QUIZ_QUESTIONS) q.textContent = window.QUIZ_QUESTIONS.length;
    if (i && window.INTERVIEW_QUESTIONS) i.textContent = window.INTERVIEW_QUESTIONS.length;
  }

  // Pick the single most useful next action based on what the user has done.
  function nextAction(p) {
    // Mid-plan? That's the strongest signal — finish what you started.
    const planKey = (window.Progress && window.Progress.getActivePlan)
      ? window.Progress.getActivePlan()
      : null;
    if (planKey && p.studyPlan && p.studyPlan[planKey]) {
      const done = p.studyPlan[planKey];
      const total = { "3-day": 3, "1-week": 7, "1-month": 4 }[planKey] || 7;
      let firstOpen = -1;
      for (let d = 0; d < total; d++) {
        if (!done[d]) { firstOpen = d; break; }
      }
      const completed = Object.values(done).filter(Boolean).length;
      if (firstOpen >= 0 && completed > 0) {
        return {
          title: "Pick up where you left off",
          body: "You're on the " + planKey + " plan — day " + (firstOpen + 1) + " is next.",
          href: "pages/study-plan.html",
          cta: "Continue plan →"
        };
      }
    }

    // Started hunting bugs but hasn't written a report yet.
    const anyFinds = p.bugBounty && Object.values(p.bugBounty).some((a) => a && a.length);
    if (anyFinds && p.bugReports === 0) {
      return {
        title: "You've found defects — now write one up",
        body: "Turning a find into a clean bug report is the skill interviewers actually test.",
        href: "pages/bug-report-builder.html",
        cta: "Open Bug Report Builder →"
      };
    }

    // Has quiz history — point at the weakest category.
    const cats = Object.entries(p.quiz.byCategory || {});
    if (cats.length) {
      let worst = null;
      cats.forEach(([name, c]) => {
        if (c.attempted < 3) return;
        const pct = c.correct / c.attempted;
        if (!worst || pct < worst.pct) worst = { name: name, pct: pct };
      });
      if (worst && worst.pct < 0.8) {
        return {
          title: "Shore up your weakest area",
          body: "You're at " + Math.round(worst.pct * 100) + "% on " + worst.name + ". A few more reps will move it.",
          href: "pages/practice-tests.html?category=" + encodeURIComponent(worst.name),
          cta: "Drill " + worst.name + " →"
        };
      }
      return {
        title: "Keep the streak going",
        body: "Your accuracy is looking solid. Try a bug hunt for a different kind of rep.",
        href: "pages/practice-apps.html#buggy",
        cta: "Start a bug hunt →"
      };
    }

    return null; // brand-new visitor: the hero already tells them what to do
  }

  function renderResume() {
    const strip = document.getElementById("resume-strip");
    if (!strip || !window.Progress) return;

    const p = window.Progress.get();
    const action = nextAction(p);
    if (!action) return;

    const dust = window.RPG ? window.RPG.computeStarDust(p) : 0;
    const runs = p.quiz.runs.length;
    const streak = (p.streak && p.streak.days) || 0;

    const card = document.createElement("div");
    card.className = "resume-card";
    card.setAttribute("data-testid", "resume-card");

    const left = document.createElement("div");
    const h = document.createElement("h2");
    h.textContent = action.title;
    const body = document.createElement("p");
    body.textContent = action.body;
    left.append(h, body);

    if (runs || dust || streak) {
      const meta = document.createElement("div");
      meta.className = "resume-meta";
      const bits = [];
      if (runs) bits.push([String(runs), runs === 1 ? " quiz run" : " quiz runs"]);
      if (dust) bits.push([dust.toLocaleString(), " Star-Dust"]);
      if (streak) bits.push([String(streak), streak === 1 ? " day streak" : " day streak"]);
      bits.forEach(function (pair) {
        const span = document.createElement("span");
        const strong = document.createElement("strong");
        strong.textContent = pair[0];
        span.append(strong, document.createTextNode(pair[1]));
        meta.appendChild(span);
      });
      left.appendChild(meta);
    }

    const cta = document.createElement("a");
    cta.className = "btn btn-primary";
    cta.href = action.href;
    cta.textContent = action.cta;
    cta.setAttribute("data-testid", "resume-cta");

    card.append(left, cta);
    strip.appendChild(card);
    strip.classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderStats();
    renderResume();
  });
})();
