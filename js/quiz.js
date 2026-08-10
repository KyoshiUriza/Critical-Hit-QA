(function () {
  const state = {
    questions: [],
    index: 0,
    answers: [], // { qId, chosen, correct }
    startTime: 0,
    timeLimitMs: 0,
    timerId: null,
    checked: false
  };

  const el = (id) => document.getElementById(id);
  // Defensive escape — quiz data is currently a bundled static file, but if a future
  // feature ever loads user-supplied questions this keeps the renderer safe.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startQuiz() {
    const cat = el("category-select").value;
    const count = Math.max(1, parseInt(el("question-count").value, 10) || 10);
    const timeMin = parseInt(el("time-limit").value, 10) || 0;

    let pool = window.QUIZ_QUESTIONS || [];
    if (cat !== "all") pool = pool.filter((q) => q.category === cat);
    if (pool.length === 0) {
      alert("No questions found in this category.");
      return;
    }
    state.questions = shuffle(pool).slice(0, Math.min(count, pool.length));
    state.index = 0;
    state.answers = [];
    state.timeLimitMs = timeMin * 60 * 1000;
    state.startTime = Date.now();
    state.checked = false;

    el("setup-screen").classList.add("hidden");
    el("results-screen").classList.add("hidden");
    el("quiz-screen").classList.remove("hidden");

    if (state.timeLimitMs > 0) startTimer();
    else el("timer-label").textContent = "no limit";
    renderQuestion();
  }

  function startTimer() {
    if (state.timerId) clearInterval(state.timerId);
    tickTimer();
    state.timerId = setInterval(tickTimer, 1000);
  }

  function tickTimer() {
    const remain = state.timeLimitMs - (Date.now() - state.startTime);
    if (remain <= 0) {
      clearInterval(state.timerId);
      el("timer-label").textContent = "0:00";
      finishQuiz(true);
      return;
    }
    const s = Math.floor(remain / 1000);
    el("timer-label").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function renderQuestion() {
    const q = state.questions[state.index];
    state.checked = false;
    el("question-text").textContent = q.question;
    el("category-label").textContent = `${q.category} · ${q.difficulty}`;
    el("progress-label").textContent = `Question ${state.index + 1} of ${state.questions.length}`;
    el("progress-bar").style.width = `${((state.index) / state.questions.length) * 100}%`;
    el("explanation-box").classList.add("hidden");
    el("check-btn").classList.remove("hidden");
    el("next-btn").disabled = true;
    el("next-btn").textContent = state.index === state.questions.length - 1 ? "Finish" : "Next →";

    const list = el("choices-list");
    list.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const label = document.createElement("label");
      label.className = "quiz-choice";
      const input = document.createElement("input");
      input.type = "radio"; input.name = "choice"; input.value = String(i);
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + choice));
      label.addEventListener("click", () => selectChoice(i, label));
      list.appendChild(label);
    });
  }

  function selectChoice(i, label) {
    if (state.checked) return;
    document.querySelectorAll(".quiz-choice").forEach((c) => c.classList.remove("selected"));
    label.classList.add("selected");
    label.querySelector("input").checked = true;
    el("check-btn").classList.remove("hidden");
    el("next-btn").disabled = true;
  }

  function checkAnswer() {
    const selected = document.querySelector('input[name="choice"]:checked');
    if (!selected) {
      alert("Pick an answer first.");
      return;
    }
    const chosen = parseInt(selected.value, 10);
    const q = state.questions[state.index];
    const isCorrect = chosen === q.answer;
    state.answers.push({ q, chosen, correct: isCorrect });

    document.querySelectorAll(".quiz-choice").forEach((c, i) => {
      c.querySelector("input").disabled = true;
      if (i === q.answer) c.classList.add("correct");
      else if (i === chosen) c.classList.add("wrong");
    });
    const box = el("explanation-box");
    box.innerHTML = "";
    const verdict = document.createElement("strong");
    verdict.textContent = isCorrect ? "✓ Correct." : "✗ Incorrect.";
    box.appendChild(verdict);
    box.appendChild(document.createTextNode(" " + q.explanation));
    box.classList.remove("hidden");
    state.checked = true;
    el("check-btn").classList.add("hidden");
    el("next-btn").disabled = false;
  }

  function nextQuestion() {
    if (!state.checked) return;
    if (state.index + 1 >= state.questions.length) {
      finishQuiz(false);
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  function finishQuiz(timedOut) {
    if (state.timerId) clearInterval(state.timerId);
    el("quiz-screen").classList.add("hidden");
    el("results-screen").classList.remove("hidden");
    const correct = state.answers.filter((a) => a.correct).length;
    const total = state.questions.length;
    const elapsedMs = Date.now() - state.startTime;
    if (window.Progress) {
      const category = document.getElementById("category-select").value;
      window.Progress.recordQuizRun({ category, correct, total, elapsedMs });
    }
    el("score-display").textContent = `${correct}/${total}`;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    let verdict = "Keep studying.";
    if (pct >= 90) verdict = "Excellent — you know this cold.";
    else if (pct >= 75) verdict = "Solid. Interview-ready with a bit more polish.";
    else if (pct >= 60) verdict = "Getting there. Review the misses.";
    el("score-summary").textContent = `${pct}% correct. ${verdict}${timedOut ? " (Time expired.)" : ""}`;
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    el("time-summary").textContent = `Elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
    el("review-list").classList.add("hidden");
    el("review-list").innerHTML = "";
  }

  function renderReview() {
    const list = el("review-list");
    if (!list.classList.contains("hidden")) {
      list.classList.add("hidden");
      return;
    }
    list.innerHTML = "";
    const heading = document.createElement("h3");
    heading.textContent = "Review";
    list.appendChild(heading);
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "panel";
      const meta = document.createElement("div");
      meta.className = "quiz-meta";
      meta.textContent = `Q${i + 1} · ${a.q.category} · ${a.q.difficulty}`;
      const question = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = a.q.question;
      question.appendChild(strong);
      const yourAns = document.createElement("p");
      yourAns.className = a.correct ? "" : "difficulty-hard";
      yourAns.textContent = `Your answer: ${a.q.choices[a.chosen]} ${a.correct ? "✓" : "✗"}`;
      div.append(meta, question, yourAns);
      if (!a.correct) {
        const correctAns = document.createElement("p");
        correctAns.className = "difficulty-easy";
        correctAns.textContent = `Correct answer: ${a.q.choices[a.q.answer]}`;
        div.appendChild(correctAns);
      }
      const expl = document.createElement("div");
      expl.className = "quiz-explanation";
      expl.textContent = a.q.explanation;
      div.appendChild(expl);
      list.appendChild(div);
    });
    list.classList.remove("hidden");
  }

  function quit() {
    if (!confirm("Quit the quiz? Progress will be lost.")) return;
    if (state.timerId) clearInterval(state.timerId);
    el("quiz-screen").classList.add("hidden");
    el("results-screen").classList.add("hidden");
    el("setup-screen").classList.remove("hidden");
    syncPool();
  }

  // Deep link support: practice-tests.html?category=manual preselects the drill,
  // and ?count=all starts with the whole bank.
  function applyUrlParams() {
    const params = new URLSearchParams(location.search);

    const want = params.get("category");
    const sel = el("category-select");
    if (want && sel && [...sel.options].some((o) => o.value === want)) sel.value = want;

    syncPool();

    const count = params.get("count");
    if (count === "all") useAll();
    else if (count && !isNaN(parseInt(count, 10))) {
      el("question-count").value = String(Math.min(parseInt(count, 10), poolSize()));
    }
  }

  // How many questions the current category actually offers.
  function poolSize() {
    const cat = el("category-select").value;
    const all = window.QUIZ_QUESTIONS || [];
    return cat === "all" ? all.length : all.filter((q) => q.category === cat).length;
  }

  // Keep the max, the All button, and the hint truthful as the category changes.
  function syncPool() {
    const total = poolSize();
    const input = el("question-count");
    const allBtn = el("use-all");
    const hint = el("pool-hint");

    input.max = String(total);
    allBtn.textContent = "All (" + total + ")";
    allBtn.disabled = total === 0;

    const current = parseInt(input.value, 10);
    // Silently truncating a request for 10 when only 4 exist is confusing —
    // clamp it so the field always shows what you will actually get.
    if (!isNaN(current) && current > total) input.value = String(total);
    if (total > 0 && (isNaN(current) || current < 1)) input.value = "1";

    const catLabel = el("category-select").selectedOptions[0].textContent;
    if (total === 0) {
      hint.textContent = "No questions in " + catLabel + " yet.";
    } else {
      const asking = parseInt(input.value, 10) || total;
      hint.textContent = asking >= total
        ? catLabel + " — all " + total + " question" + (total === 1 ? "" : "s") + " selected."
        : catLabel + " — " + total + " available.";
    }
  }

  function useAll() {
    el("question-count").value = String(poolSize());
    syncPool();
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyUrlParams();
    el("category-select").addEventListener("change", syncPool);
    el("question-count").addEventListener("input", syncPool);
    el("use-all").addEventListener("click", useAll);
    el("start-btn").addEventListener("click", startQuiz);
    el("check-btn").addEventListener("click", checkAnswer);
    el("next-btn").addEventListener("click", nextQuestion);
    el("quit-btn").addEventListener("click", quit);
    el("restart-btn").addEventListener("click", () => {
      el("results-screen").classList.add("hidden");
      el("setup-screen").classList.remove("hidden");
      syncPool();
    });
    el("review-btn").addEventListener("click", renderReview);
  });
})();
