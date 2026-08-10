(function () {
  const state = {
    activeCategory: "All",
    difficulty: "all",
    search: ""
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
    list.innerHTML = q.map((item) => `
      <details class="q-item">
        <summary>
          <div>
            <div>${escape(item.question)}</div>
            <div>
              <span class="tag difficulty-${item.difficulty}">${item.difficulty}</span>
              <span class="tag">${escape(item.category)}</span>
            </div>
          </div>
        </summary>
        <div class="answer">${escape(item.answer)}</div>
      </details>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTabs();
    renderList();
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
