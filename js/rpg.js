// The Tester's Lattice — RPG progression layer over the Progress store.
// Lore vocabulary drawn from The Resonance Lattice (The Convergence Chronicles).
(function () {
  const RANKS = [
    { level:  1, name: "Unbound",              starDust:      0, blurb: "Before the binding. The Catalyst is still in its case." },
    { level:  2, name: "Trainee",              starDust:    100, blurb: "First contact with the System. Notifications start to make sense." },
    { level:  3, name: "Contract Tester",      starDust:    250, blurb: "The mask holds. The ticket queue does not." },
    { level:  4, name: "Bound Awakened",       starDust:    500, blurb: "The Catalyst binds. The Toll rewrites you between heartbeats." },
    { level:  5, name: "Field Tester",         starDust:    900, blurb: "Event Horizon at Stage 1. The lattice starts to feel like a room you know." },
    { level:  6, name: "Senior Tester",        starDust:   1400, blurb: "You read intent a half-second ahead. Bugs stop hiding well." },
    { level:  7, name: "Signature Bearer",     starDust:   2000, blurb: "A Signature Ability responds. The math finishes before your conscience starts." },
    { level:  8, name: "Ghost of the Lattice", starDust:   2800, blurb: "Aetherically background static. Every hunter on the East Coast can see you coming." },
    { level:  9, name: "Priority Alpha",       starDust:   4000, blurb: "D.A.C. has a designation on a pattern they cannot locate. That's you." },
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

  const ACHIEVEMENTS = [
    { id: "first-binding", name: "First Binding", lore: "The Catalyst binds before you can stop it.",
      condition: (p) => p.quiz.runs.length >= 1,
      hint: "Complete your first practice quiz." },
    { id: "event-horizon", name: "Event Horizon — Stage 1", lore: "A five-meter field. You can feel the room now.",
      condition: (p) => Object.keys(p.quiz.byCategory).length >= 3,
      hint: "Take a quiz in three different categories." },
    { id: "reserve-cache", name: "Reserve: Cache", lore: "A latent Signature. What you stored is ready.",
      condition: (p) => p.testCases >= 5,
      hint: "Draft 5 test cases." },
    { id: "held-breath", name: "Held Breath: Pierce", lore: "The mark. The seam. The strike from range.",
      condition: (p) => p.bugReports >= 5,
      hint: "Draft 5 bug reports." },
    { id: "vigil-hold", name: "Vigil: Hold", lore: "Remii kept everyone functional at cost of her own reserves.",
      condition: (p) => (p.streak && p.streak.days >= 7),
      hint: "Study 7 days in a row." },
    { id: "phantom-strike", name: "Phantom Strike", lore: "The after-image. The strike you weren't there to take.",
      condition: (p) => p.quiz.runs.some((r) => r.total >= 10 && r.correct === r.total),
      hint: "Score 100% on a 10+ question quiz." },
    { id: "pursuit-flicker", name: "Pursuit: Flicker", lore: "Three micro-displacements. Kestrel's counter can't track it.",
      condition: (p) => p.quiz.runs.length >= 15,
      hint: "Complete 15 quiz runs." },
    { id: "the-ghost", name: "The Ghost", lore: "The System pinned it to a man who glows in the dark.",
      condition: (p) => computeAllBountyPct(p) >= 90,
      hint: "Catch 90% of defects in Bug Bounty (severity-weighted)." },
    { id: "priority-alpha", name: "Priority Alpha", lore: "D.A.C. formalizes a designation on a pattern they can't locate.",
      condition: (p) => {
        const cats = Object.values(p.quiz.byCategory);
        if (cats.length < 5) return false;
        return cats.every((c) => c.attempted >= 5 && c.correct / c.attempted >= 0.85);
      },
      hint: "Reach 85% accuracy in 5+ categories with 5+ attempts each." },
    { id: "the-tester", name: "The Tester Absolute", lore: "You stopped chasing the pattern and started breaking it.",
      condition: (p) => {
        const s = computeStarDust(p);
        return s >= 6000;
      },
      hint: "Reach 6000 Star-Dust." }
  ];

  const CATALYSTS = [
    { id: "nebula",  name: "Catalyst of the Nebula",  ability: "Event Horizon",   grantedAt: "Awarded on completing your first quiz.",
      condition: (p) => p.quiz.runs.length >= 1 },
    { id: "reserve", name: "Catalyst of the Reserve", ability: "Held Inventory",  grantedAt: "Awarded when you draft your first test case.",
      condition: (p) => p.testCases >= 1 },
    { id: "vigil",   name: "Catalyst of the Vigil",   ability: "Vigil: Hold",     grantedAt: "Awarded when you draft your first bug report.",
      condition: (p) => p.bugReports >= 1 },
    { id: "fox",     name: "Catalyst of the Fox",     ability: "Slip / Pressure Point", grantedAt: "Awarded when your bug bounty score reaches 25%.",
      condition: (p) => computeAllBountyPct(p) >= 25 },
    { id: "harvest", name: "Catalyst of the Harvest", ability: "Creature Affinity",   grantedAt: "Awarded when you complete a study plan day.",
      condition: (p) => Object.values(p.studyPlan || {}).some((plan) => Object.values(plan).some(Boolean)) }
  ];

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

  function unlockedCatalysts(p) {
    return CATALYSTS.filter((c) => {
      try { return c.condition(p); } catch (_) { return false; }
    }).map((c) => c.id);
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
    t.innerHTML = `<div class="rpg-toast-title">${title}</div><div class="rpg-toast-body">${body}</div>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("visible"));
    setTimeout(() => {
      t.classList.remove("visible");
      setTimeout(() => t.remove(), 400);
    }, 4200);
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
    chip.innerHTML = `
      <span class="rpg-chip-rank">Lv.${current.level} ${current.name}</span>
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
    RANKS, ACHIEVEMENTS, CATALYSTS, XP, SEVERITY_WEIGHT,
    computeStarDust, computeRank, unlockedAchievements, unlockedCatalysts,
    checkAndToastUnlocks, mountHeaderChip
  };

  document.addEventListener("DOMContentLoaded", () => {
    mountHeaderChip();
    checkAndToastUnlocks();
  });
})();
