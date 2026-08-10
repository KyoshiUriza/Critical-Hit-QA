// The Tester's Lattice — RPG progression layer over the Progress store.
// Lore vocabulary drawn from The Resonance Lattice (The Convergence Chronicles).
//
// Reworked per ADR 0003: the vocabulary (Star-Dust, Ranks, the Lattice) stays,
// but every blurb and description must carry meaning for someone who has never
// read the book. The previous versions quoted plot — characters, factions,
// events — which read as noise to the site's actual audience. Each rank now
// describes the point in a real QA journey it corresponds to, so the ladder
// doubles as a skills roadmap.
(function () {
  const RANKS = [
    { level:  1, name: "Unbound",              starDust:      0, blurb: "Before the binding. Your first quiz starts the record." },
    { level:  2, name: "Trainee",              starDust:    100, blurb: "The vocabulary lands: severity, priority, smoke, regression." },
    { level:  3, name: "Contract Tester",      starDust:    250, blurb: "You can execute a written test and file a defect a developer can act on." },
    { level:  4, name: "Bound Awakened",       starDust:    500, blurb: "The fundamentals bind. You design tests now, not just run them." },
    { level:  5, name: "Field Tester",         starDust:    900, blurb: "Unfamiliar UIs stop being intimidating. Exploratory sessions produce real finds." },
    { level:  6, name: "Senior Tester",        starDust:   1400, blurb: "You read intent a half-second ahead. Bugs stop hiding well." },
    { level:  7, name: "Signature Bearer",     starDust:   2000, blurb: "A specialty emerges — automation, SQL, API. Your signature skill answers when called." },
    { level:  8, name: "Ghost of the Lattice", starDust:   2800, blurb: "You find what others walk straight past. Ninety percent of the seeded defects is in reach." },
    { level:  9, name: "Priority Alpha",       starDust:   4000, blurb: "High accuracy across five categories at once. Interview panels notice patterns like you." },
    { level: 10, name: "The Tester Absolute",  starDust:   6000, blurb: "You do not chase the pattern. You break it." }
  ];

  const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 5 };

  // XP formula — each action grants Star-Dust.
  const XP = {
    perQuizCorrect: 8,
    perQuizWrong: 2,     // participation
    perBountySeverity: 10, // per severity point of a caught defect
    perTestCase: 25,
    perBugReport: 25,
    perStudyDay: 40,
    perStreakDay: 5      // bonus per day of current streak (up to 30)
  };

  // ids are persisted in qaprep_rpg_seen and must stay stable across renames —
  // changing one would re-toast the achievement for everyone who has it.
  // The lore field describes the QA skill the milestone evidences, because an
  // achievement whose text only makes sense to readers of the book is a
  // trophy for the wrong thing.
  const ACHIEVEMENTS = [
    { id: "first-binding", name: "First Binding", lore: "Your first quiz run. Every record starts with a first entry.",
      condition: (p) => p.quiz.runs.length >= 1,
      hint: "Complete your first practice quiz." },
    { id: "event-horizon", name: "Event Horizon", lore: "Three categories attempted. Range matters as much as depth — interviews probe both.",
      condition: (p) => Object.keys(p.quiz.byCategory).length >= 3,
      hint: "Take a quiz in three different categories." },
    { id: "reserve-cache", name: "Reserve: Cache", lore: "Five test cases drafted. Test design is now something you do, not something you can define.",
      condition: (p) => p.testCases >= 5,
      hint: "Draft 5 test cases." },
    { id: "held-breath", name: "Held Breath: Pierce", lore: "Five bug reports drafted. A clear report is the skill developers actually thank testers for.",
      condition: (p) => p.bugReports >= 5,
      hint: "Draft 5 bug reports." },
    { id: "vigil-hold", name: "Vigil: Hold", lore: "Seven straight days of practice. Consistency is the one skill nobody can cram.",
      condition: (p) => (p.streak && p.streak.days >= 7),
      hint: "Study 7 days in a row." },
    { id: "phantom-strike", name: "Phantom Strike", lore: "A perfect score on a full-length quiz. At ten questions, that isn't luck.",
      condition: (p) => p.quiz.runs.some((r) => r.total >= 10 && r.correct === r.total),
      hint: "Score 100% on a 10+ question quiz." },
    { id: "pursuit-flicker", name: "Pursuit: Flicker", lore: "Fifteen quiz runs. Repetition is how recognition becomes recall — and recall is what interviews test.",
      condition: (p) => p.quiz.runs.length >= 15,
      hint: "Complete 15 quiz runs." },
    { id: "the-ghost", name: "The Ghost", lore: "Ninety percent of the seeded defects found, weighted by severity. You find what others walk past.",
      condition: (p) => computeAllBountyPct(p) >= 90,
      hint: "Catch 90% of defects in Bug Bounty (severity-weighted)." },
    { id: "priority-alpha", name: "Priority Alpha", lore: "85% accuracy across five categories at once. Breadth and depth at the same time is rare.",
      condition: (p) => {
        const cats = Object.values(p.quiz.byCategory);
        if (cats.length < 5) return false;
        return cats.every((c) => c.attempted >= 5 && c.correct / c.attempted >= 0.85);
      },
      hint: "Reach 85% accuracy in 5+ categories with 5+ attempts each." },
    { id: "the-tester", name: "The Tester Absolute", lore: "Six thousand Star-Dust. The ledger speaks for itself.",
      condition: (p) => {
        const s = computeStarDust(p);
        return s >= 6000;
      },
      hint: "Reach 6000 Star-Dust." }
  ];

  // ── Skills ─────────────────────────────────────────────────────────────
  // The character sheet's core. Every skill is derived from evidence the
  // Progress store already holds — nothing is self-assessed, because a
  // self-assessed skill bar is decoration, and this site's premise is that
  // claims should be checkable.
  const TIERS = ["Untrained", "Novice", "Apprentice", "Practitioner", "Adept", "Expert"];

  const KNOWLEDGE_SKILLS = [
    { id: "fundamentals", name: "QA Fundamentals" },
    { id: "manual",       name: "Manual Testing" },
    { id: "automation",   name: "Test Automation" },
    { id: "api",          name: "API Testing" },
    { id: "agile",        name: "Agile & Process" },
    { id: "performance",  name: "Performance" },
    { id: "sql",          name: "SQL & Data" },
    { id: "ai",           name: "AI in Testing" }
  ];

  // Tier requires BOTH volume and accuracy: accuracy alone can be three lucky
  // questions, and volume alone can be fifty coin flips. The thresholds climb
  // together so the bar only moves when the evidence does.
  function knowledgeTier(attempted, correct) {
    const acc = attempted > 0 ? correct / attempted : 0;
    if (attempted >= 50 && acc >= 0.85) return 5;
    if (attempted >= 35 && acc >= 0.80) return 4;
    if (attempted >= 20 && acc >= 0.70) return 3;
    if (attempted >= 10 && acc >= 0.60) return 2;
    if (attempted >= 1) return 1;
    return 0;
  }

  function countTier(n, ladder) {
    for (let i = ladder.length - 1; i >= 0; i--) {
      if (n >= ladder[i]) return i + 1;
    }
    return 0;
  }

  function computeSkills(p) {
    const knowledge = KNOWLEDGE_SKILLS.map((k) => {
      const c = p.quiz.byCategory[k.id] || { attempted: 0, correct: 0 };
      const tier = knowledgeTier(c.attempted, c.correct);
      const acc = c.attempted > 0 ? Math.round(c.correct / c.attempted * 100) : 0;
      return {
        id: k.id, name: k.name, kind: "knowledge",
        tier: tier, tierName: TIERS[tier], pct: Math.round(tier / 5 * 100),
        detail: c.attempted > 0
          ? c.correct + "/" + c.attempted + " correct (" + acc + "%)"
          : "No attempts yet"
      };
    });

    const bountyPct = computeAllBountyPct(p);
    const streakDays = (p.streak && p.streak.days) || 0;
    const craft = [
      { id: "defect-hunting", name: "Defect Hunting",
        tier: bountyPct >= 90 ? 5 : bountyPct >= 75 ? 4 : bountyPct >= 50 ? 3 : bountyPct >= 25 ? 2 : bountyPct > 0 ? 1 : 0,
        detail: bountyPct > 0 ? bountyPct + "% of seeded defects found (severity-weighted)" : "No defects found yet" },
      { id: "test-design", name: "Test Design",
        tier: countTier(p.testCases || 0, [1, 3, 7, 12, 20]),
        detail: (p.testCases || 0) > 0 ? (p.testCases) + " test case" + (p.testCases === 1 ? "" : "s") + " drafted" : "No test cases yet" },
      { id: "bug-reporting", name: "Bug Reporting",
        tier: countTier(p.bugReports || 0, [1, 3, 7, 12, 20]),
        detail: (p.bugReports || 0) > 0 ? (p.bugReports) + " report" + (p.bugReports === 1 ? "" : "s") + " drafted" : "No bug reports yet" },
      { id: "consistency", name: "Consistency",
        tier: countTier(streakDays, [1, 3, 7, 14, 30]),
        detail: streakDays > 0 ? streakDays + "-day streak" : "No streak yet" }
    ].map((s) => ({
      ...s, kind: "craft", tierName: TIERS[s.tier], pct: Math.round(s.tier / 5 * 100)
    }));

    return { knowledge: knowledge, craft: craft };
  }

  function computeAllBountyPct(p) {
    if (!window.APP_DEFECTS) return 0;
    let totalW = 0, foundW = 0;
    Object.entries(window.APP_DEFECTS).forEach(([key, app]) => {
      const found = new Set((p.bugBounty || {})[key] || []);
      app.defects.forEach((d) => {
        const w = SEVERITY_WEIGHT[d.severity];
        totalW += w;
        if (found.has(d.id)) foundW += w;
      });
    });
    return totalW > 0 ? Math.round(foundW / totalW * 100) : 0;
  }

  function computeStarDust(p) {
    let s = 0;
    // Quiz XP
    Object.values(p.quiz.byCategory).forEach((c) => {
      s += c.correct * XP.perQuizCorrect;
      s += (c.attempted - c.correct) * XP.perQuizWrong;
    });
    // Bug bounty XP — severity-weighted per app
    if (window.APP_DEFECTS) {
      Object.entries(window.APP_DEFECTS).forEach(([key, app]) => {
        const found = new Set((p.bugBounty || {})[key] || []);
        app.defects.forEach((d) => {
          if (found.has(d.id)) s += SEVERITY_WEIGHT[d.severity] * XP.perBountySeverity;
        });
      });
    }
    s += (p.testCases || 0) * XP.perTestCase;
    s += (p.bugReports || 0) * XP.perBugReport;
    // Study plan days
    Object.values(p.studyPlan || {}).forEach((plan) => {
      Object.values(plan).forEach((done) => { if (done) s += XP.perStudyDay; });
    });
    // Streak bonus (cap 30)
    s += Math.min(30, (p.streak && p.streak.days) || 0) * XP.perStreakDay;
    return s;
  }

  function computeRank(starDust) {
    let current = RANKS[0];
    let next = RANKS[1];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (starDust >= RANKS[i].starDust) {
        current = RANKS[i];
        next = RANKS[i + 1] || null;
        break;
      }
    }
    return { current, next };
  }

  function unlockedAchievements(p) {
    return ACHIEVEMENTS.filter((a) => {
      try { return a.condition(p); } catch (_) { return false; }
    }).map((a) => a.id);
  }

  // Toast for newly-unlocked achievements. Compares to what was unlocked last check
  // (stored in localStorage under qaprep_rpg_seen).
  function checkAndToastUnlocks() {
    if (!window.Progress || !document.body) return;
    const p = window.Progress.get();
    const now = new Set(unlockedAchievements(p));
    // Tampered or malformed storage must not break the toast pipeline.
    let seenList = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("qaprep_rpg_seen") || "[]");
      if (Array.isArray(parsed)) seenList = parsed.filter((x) => typeof x === "string");
    } catch (_) { /* fall through to empty */ }
    const seen = new Set(seenList);
    const newly = [...now].filter((id) => !seen.has(id));
    if (newly.length === 0) return;
    newly.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      setTimeout(() => toast(`✦ Signature Unlocked — ${a.name}`, a.lore), i * 400);
    });
    localStorage.setItem("qaprep_rpg_seen", JSON.stringify([...now]));
  }

  function toast(title, body) {
    const t = document.createElement("div");
    t.className = "rpg-toast";
    // It announces an achievement, so assistive tech needs to hear it — and a
    // timed notification that cannot be dismissed fails 2.2.1.
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");

    const h = document.createElement("div");
    h.className = "rpg-toast-title";
    h.textContent = title;

    const b = document.createElement("div");
    b.className = "rpg-toast-body";
    b.textContent = body;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "rpg-toast-dismiss";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";

    let done = false;
    const remove = () => {
      if (done) return;
      done = true;
      t.classList.remove("visible");
      setTimeout(() => t.remove(), 400);
    };
    close.addEventListener("click", remove);

    t.append(h, b, close);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("visible"));
    setTimeout(remove, 6000);
  }

  // Header chip — mount if a header nav exists.
  function mountHeaderChip() {
    const nav = document.querySelector(".site-header .container.header-inner");
    if (!nav || nav.querySelector(".rpg-chip")) return;
    const p = window.Progress ? window.Progress.get() : null;
    if (!p) return;
    const s = computeStarDust(p);
    const { current, next } = computeRank(s);
    const pctToNext = next ? Math.min(100, Math.round((s - current.starDust) / (next.starDust - current.starDust) * 100)) : 100;
    const chip = document.createElement("a");
    chip.href = pageHrefTo("tester-lattice.html");
    chip.className = "rpg-chip";
    chip.setAttribute("title", `${current.name} · ${s} Star-Dust${next ? ` · ${next.starDust - s} to ${next.name}` : ""}`);
    // Level and rank name are separate spans so CSS can drop the NAME on
    // narrower viewports while keeping the level. Combined in one span, the
    // chip claimed ~110px it could not afford between 1251 and 1306px, which
    // overflowed the page horizontally on Linux (see the breakpoint note in
    // styles.css). The title attribute keeps the full text available.
    chip.innerHTML = `
      <span class="rpg-chip-lv">Lv.${current.level}</span>
      <span class="rpg-chip-rank">${current.name}</span>
      <span class="rpg-chip-dust">✦ ${s}</span>
      <span class="rpg-chip-bar"><span style="width:${pctToNext}%"></span></span>
    `;
    nav.appendChild(chip);
  }

  // Resolve a pages/ URL from anywhere in the site.
  // Depth comes from <body data-depth>, the same source site-chrome.js uses —
  // no path sniffing, so adding a directory level can't silently break links.
  function pageHrefTo(page) {
    const prefix = (window.SiteChrome && window.SiteChrome.prefix)
      ? window.SiteChrome.prefix()
      : "";
    return prefix + "pages/" + page;
  }

  window.RPG = {
    RANKS, ACHIEVEMENTS, XP, SEVERITY_WEIGHT, TIERS,
    computeStarDust, computeRank, computeSkills, computeAllBountyPct,
    unlockedAchievements, checkAndToastUnlocks, mountHeaderChip
  };

  document.addEventListener("DOMContentLoaded", () => {
    mountHeaderChip();
    checkAndToastUnlocks();
  });
})();
