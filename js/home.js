// Populate stats on the home page.
document.addEventListener("DOMContentLoaded", () => {
  const q = document.getElementById("stat-questions");
  const i = document.getElementById("stat-interview");
  if (q && window.QUIZ_QUESTIONS) q.textContent = window.QUIZ_QUESTIONS.length;
  if (i && window.INTERVIEW_QUESTIONS) i.textContent = window.INTERVIEW_QUESTIONS.length;
});
