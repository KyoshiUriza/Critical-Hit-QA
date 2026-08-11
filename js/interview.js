(function () {
  const state = {
    activeCategory: "All",
    difficulty: "all",
    search: "",
    rehearse: false
  };

  function escape(html) {
    return html.replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function categories() {
    const set = new Set(["All"]);
    (window.INTERVIEW_QUESTIONS || []).forEach((q) => set.add(q.category));
    return Array.from(set);
  }

  function renderTabs() {
    const tabs = document.getElementById("category-tabs");
    tabs.innerHTML = "";
    categories().forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "category-tab" + (cat === state.activeCategory ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        state.activeCategory = cat;
        renderTabs();
        renderList();
      });
      tabs.appendChild(btn);
    });
  }

  function renderList() {
    const list = document.getElementById("questions-list");
    const q = (window.INTERVIEW_QUESTIONS || []).filter((item) => {
      if (state.activeCategory !== "All" && item.category !== state.activeCategory) return false;
      if (state.difficulty !== "all" && item.difficulty !== state.difficulty) return false;
      if (state.search) {
        const s = state.search.toLowerCase();
        if (!item.question.toLowerCase().includes(s) && !item.answer.toLowerCase().includes(s)) return false;
      }
      return true;
    });
    document.getElementById("result-count").textContent = `${q.length} question${q.length === 1 ? "" : "s"}`;
    if (q.length === 0) {
      list.innerHTML = `<div class="panel text-dim">No questions match your filters.</div>`;
      return;
    }
    list.innerHTML = q.map((item, i) => `
      <details class="q-item" data-qi="${i}">
        <summary>
          <div>
            <div>${escape(item.question)}</div>
            <div>
              <span class="tag difficulty-${item.difficulty}">${item.difficulty}</span>
              <span class="tag">${escape(item.category)}</span>
            </div>
          </div>
        </summary>
        ${state.rehearse ? rehearseBlock(i) : ""}
        <div class="answer${state.rehearse ? " hidden" : ""}" data-answer="${i}">${escape(item.answer)}</div>
      </details>
    `).join("");

    if (state.rehearse) wireRehearsal();
  }

  // ── Rehearsal mode ────────────────────────────────────────────────────
  // The gap this closes: every other feature on the site is multiple choice or
  // a form. Interviews are spoken, and the research was blunt about it —
  // interviewers grade how you think out loud. Reading a model answer feels
  // like learning and measures nothing; committing to your own answer first is
  // the only way to find out whether you actually had one.
  //
  // The self-scoring checklist is the same four things every strong answer in
  // this bank does, which is why it can be generic without being vague.
  const RUBRIC = [
    "I gave a direct answer before the caveats — not a definition first.",
    "I named a trade-off, or said what it depends on.",
    "I used a concrete example, number, or something I have actually done.",
    "I said what I would check or do first, not just what the concept means."
  ];

  function rehearseBlock(i) {
    return `
      <div class="rehearse" data-rehearse="${i}">
        <p class="text-dim text-sm m-0">
          Say your answer out loud, then write the shape of it here. Thirty
          seconds is enough — the point is committing before you read.
        </p>
        <textarea class="rehearse-input" rows="3" data-rehearse-input="${i}"
                  placeholder="The short version of what you would say…"></textarea>
        <button class="btn btn-primary btn-sm" type="button" data-reveal="${i}">
          Reveal the model answer
        </button>
      </div>`;
  }

  function wireRehearsal() {
    document.querySelectorAll("[data-reveal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = btn.getAttribute("data-reveal");
        const answer = document.querySelector(`[data-answer="${i}"]`);
        const block = document.querySelector(`[data-rehearse="${i}"]`);
        if (!answer || !block) return;

        answer.classList.remove("hidden");
        // Lock what you wrote. Editing after reading turns a rehearsal into a
        // transcription, which is the same reason the Code Review Gauntlet
        // locks its notes at grading.
        const input = block.querySelector("[data-rehearse-input]");
        if (input) input.disabled = true;
        btn.remove();

        const check = document.createElement("div");
        check.className = "rehearse-check";
        check.setAttribute("data-testid", "rehearse-check");
        const h = document.createElement("strong");
        h.textContent = "Score yourself against the answer below";
        check.appendChild(h);
        const ul = document.createElement("ul");
        RUBRIC.forEach((line) => {
          const li = document.createElement("li");
          const lbl = document.createElement("label");
          const box = document.createElement("input");
          box.type = "checkbox";
          lbl.append(box, document.createTextNode(" " + line));
          li.appendChild(lbl);
          ul.appendChild(li);
        });
        check.appendChild(ul);
        block.appendChild(check);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTabs();
    renderList();

    const toggle = document.getElementById("rehearse-toggle");
    if (toggle) {
      toggle.addEventListener("change", (e) => {
        state.rehearse = e.target.checked;
        try { localStorage.setItem("qaprep_rehearse", state.rehearse ? "1" : "0"); } catch (_) {}
        renderList();
      });
      try {
        state.rehearse = localStorage.getItem("qaprep_rehearse") === "1";
        toggle.checked = state.rehearse;
      } catch (_) {}
      if (state.rehearse) renderList();
    }
    document.getElementById("search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      renderList();
    });
    document.getElementById("difficulty-filter").addEventListener("change", (e) => {
      state.difficulty = e.target.value;
      renderList();
    });
  });
})();
