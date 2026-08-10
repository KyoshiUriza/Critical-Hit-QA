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
    // The site advertises "export it into your portfolio" but only ever stored
    // a counter — close the tab and the authoring was gone. Artifacts hold the
    // actual drafts.
    if (!Array.isArray(data.artifacts)) data.artifacts = [];
    return data;
  }

  // Storage is finite and a portfolio is not a database. Cap it, and tell the
  // caller rather than silently dropping their work.
  const MAX_ARTIFACTS = 100;

  function newId() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

    // ── Artifacts ────────────────────────────────────────────────────────
    // type: "bug-report" | "test-case"
    // fields: the builder's own shape, stored verbatim so it can be reloaded
    //         into the form it came from.

    listArtifacts(type) {
      const data = ensure(load());
      const all = data.artifacts.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return type ? all.filter((a) => a.type === type) : all;
    },

    getArtifact(id) {
      return ensure(load()).artifacts.filter((a) => a.id === id)[0] || null;
    },

    // Returns the id so a caller can keep editing the same record instead of
    // creating a new one on every save.
    saveArtifact(artifact) {
      const data = ensure(load());
      const now = Date.now();
      let id = artifact.id;

      if (id) {
        const existing = data.artifacts.filter((a) => a.id === id)[0];
        if (existing) {
          existing.title = artifact.title || existing.title;
          existing.fields = artifact.fields;
          existing.updatedAt = now;
          save(data);
          return id;
        }
      }

      id = newId();
      data.artifacts.unshift({
        id: id,
        type: artifact.type,
        title: artifact.title || "(untitled)",
        fields: artifact.fields,
        createdAt: now,
        updatedAt: now
      });

      // Oldest first out.
      if (data.artifacts.length > MAX_ARTIFACTS) {
        data.artifacts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        data.artifacts = data.artifacts.slice(0, MAX_ARTIFACTS);
      }

      // Keep the dashboard counters consistent with what is actually stored.
      if (artifact.type === "bug-report") data.bugReports = data.artifacts.filter((a) => a.type === "bug-report").length;
      if (artifact.type === "test-case")  data.testCases  = data.artifacts.filter((a) => a.type === "test-case").length;

      updateStreak(data);
      save(data);
      return id;
    },

    deleteArtifact(id) {
      const data = ensure(load());
      const before = data.artifacts.length;
      data.artifacts = data.artifacts.filter((a) => a.id !== id);
      data.bugReports = data.artifacts.filter((a) => a.type === "bug-report").length;
      data.testCases  = data.artifacts.filter((a) => a.type === "test-case").length;
      save(data);
      return before !== data.artifacts.length;
    },

    setStudyPlanDay(planKey, dayIndex, done) {
      const data = ensure(load());
      if (!data.studyPlan[planKey]) data.studyPlan[planKey] = {};
      data.studyPlan[planKey][dayIndex] = !!done;
      data.activePlan = planKey;
      if (done) updateStreak(data);
      save(data);
    },

    // Which plan tab the user last looked at. Previously the Study Plan page
    // hardcoded "1-week" on every load, discarding the user's choice.
    getActivePlan() {
      const data = ensure(load());
      return data.activePlan || null;
    },

    setActivePlan(planKey) {
      const data = ensure(load());
      data.activePlan = planKey;
      save(data);
    }
  };

  window.Progress = Progress;
})();
