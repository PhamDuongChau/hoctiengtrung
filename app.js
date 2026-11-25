// ===== Dùng chung: lưu tiến độ =====
function getProgress() {
  return JSON.parse(localStorage.getItem("progress") || "{}");
}
function saveProgress(p) {
  localStorage.setItem("progress", JSON.stringify(p));
}

// ===== Trang chủ =====
let currentFilter = "all";

function renderLessons() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const group = LESSON_GROUPS[document.getElementById("levelSelect").value];
  const progress = getProgress();

  const list = LESSONS.filter(l => {
    const done = !!progress[l.id];
    if (group && (l.id < group.from || l.id > group.to)) return false;
    if (currentFilter === "done" && !done) return false;
    if (currentFilter === "todo" && done) return false;
    return !q || l.title.includes(q) || l.titleVi.toLowerCase().includes(q) || String(l.id) === q;
  });

  document.getElementById("lessonGrid").innerHTML = list.map(l => {
    const p = progress[l.id];
    return `
      <a class="card" href="lesson.html?id=${l.id}">
        ${l.img ? `<img class="thumb" src="${l.img}" alt="" loading="lazy">` : `<div class="thumb zh">${l.title[0]}</div>`}
        <div class="num">BÀI ${String(l.id).padStart(2, "0")}</div>
        <div class="title zh">${l.title}</div>
        <div>${l.titleVi}</div>
        <div class="meta">${l.words} từ mới · ${l.exercises} bài tập</div>
        ${p ? `<span class="badge">Đã nộp · ${p.best}%</span>` : ""}
      </a>`;
  }).join("");
  document.getElementById("empty").hidden = list.length > 0;
}

function renderStats() {
  const scores = Object.values(getProgress()).map(p => p.best);
  document.getElementById("statDone").textContent = `${scores.length}/${LESSONS.length}`;
  document.getElementById("statBest").textContent = (scores.length ? Math.max(...scores) : 0) + "%";
  document.getElementById("statAvg").textContent =
    (scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0) + "%";
}

if (document.getElementById("lessonGrid")) {
  const levelSelect = document.getElementById("levelSelect");
  levelSelect.innerHTML = `<option value="">Tất cả bài</option>` +
    LESSON_GROUPS.map((g, i) => `<option value="${i}">${g.label}</option>`).join("");
  levelSelect.addEventListener("change", renderLessons);

  document.getElementById("search").addEventListener("input", renderLessons);
  document.querySelectorAll("button.chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("button.chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter;
      renderLessons();
    });
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Xoá toàn bộ kết quả?")) { localStorage.removeItem("progress"); renderLessons(); renderStats(); }
  });
  renderLessons();
  renderStats();
}
