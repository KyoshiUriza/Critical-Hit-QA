// Shared client-side progress store. Backed by localStorage.
// All quiz, bug bounty, and study plan features read/write through this module.
(function () {
  const KEY = "qaprep_progress_v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (_) {
      return {};
    }
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function ensure(data) {
    if (!data.quiz) data.quiz = { runs: [], byCategory: {} };
    if (!data.bugBounty) data.bugBounty = {}; // { appKey: [defectId] }
    if (!data.studyPlan) data.studyPlan = {}; // { planKey: { day: bool } }
    if (!data.bugReports) data.bugReports = 0;
    if (!data.testCases) data.testCases = 0;
    if (!data.streak) data.streak = { lastDate: null, days: 0 };
    return data;
  }

  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function updateStreak(data) {
    const t = today();
    if (data.streak.lastDate === t) return;
    if (!data.streak.lastDate) {
      data.streak.days = 1;
    } else {
      const prev = new Date(data.streak.lastDate);
      const now = new Date(t);
      const diff = Math.round((now - prev) / (1000 * 60 * 60 * 24));
      data.streak.days = diff === 1 ? data.streak.days + 1 : 1;
    }
    data.streak.lastDate = t;
  }

  const Progress = {
    get() { return ensure(load()); },
    reset() { localStorage.removeItem(KEY); },

    recordQuizRun({ category, correct, total, elapsedMs }) {
      const data = ensure(load());
      const run = { category, correct, total, elapsedMs, at: today() };
      data.quiz.runs.unshift(run);
      data.quiz.runs = data.quiz.runs.slice(0, 50); // keep last 50
      const bc = data.quiz.byCategory[category] || { attempted: 0, correct: 0, runs: 0 };
      bc.attempted += total;
      bc.correct += correct;
      bc.runs += 1;
      data.quiz.byCategory[category] = bc;
      updateStreak(data);
      save(data);
    },

    setBugBountyFinds(appKey, defectIds) {
      const data = ensure(load());
      data.bugBounty[appKey] = Array.from(new Set(defectIds));
      updateStreak(data);
      save(data);
    },

    getBugBountyFinds(appKey) {
      const data = ensure(load());
      return data.bugBounty[appKey] || [];
    },

    incrementBugReports() {
      const data = ensure(load());
      data.bugReports += 1;
      updateStreak(data);
      save(data);
    },

    incrementTestCases() {
      const data = ensure(load());
      data.testCases += 1;
      updateStreak(data);
      save(data);
    },

    setStudyPlanDay(planKey, dayIndex, done) {
      const data = ensure(load());
      if (!data.studyPlan[planKey]) data.studyPlan[planKey] = {};
      data.studyPlan[planKey][dayIndex] = !!done;
      if (done) updateStreak(data);
      save(data);
    }
  };

  window.Progress = Progress;
})();
