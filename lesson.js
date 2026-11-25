// ===== Trang bài học =====
const id = Number(new URLSearchParams(location.search).get("id")) || 1;
const pad = n => String(n).padStart(2, "0");
const $ = s => document.getElementById(s);

// Tải file dữ liệu của bài: data/baiNN.js
const script = document.createElement("script");
script.src = `data/bai${pad(id)}.js`;
script.onload = () => render(LESSON_DATA[id]);
script.onerror = () => { $("lessonTitle").textContent = "Không tìm thấy bài học này."; };
document.body.appendChild(script);


// ---------- Vẽ trang ----------
function render(L) {
  document.title = `Bài ${L.id}: ${L.titleVi} · Tiếng Trung Dương Châu`;
  $("lessonNum").textContent = `BÀI ${pad(L.id)}`;
  $("lessonTitle").innerHTML = `<span class="zh">${esc(L.title)}</span> – ${esc(L.titleVi)}`;

  // Bài trước / sau
  const prev = $("prevLesson"), next = $("nextLesson");
  if (L.id > 1) prev.href = `lesson.html?id=${L.id - 1}`; else prev.hidden = true;
  if (L.id < LESSONS.length) next.href = `lesson.html?id=${L.id + 1}`; else next.hidden = true;

  // Tab
  const tabs = [...document.querySelectorAll(".tab")];
  ["phonetics", "text", "grammar"].forEach(k => {
    if (!L[k]) tabs.find(t => t.dataset.tab === k).hidden = true;   // sách không có phần này
  });
  function openTab(name) {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === name));
    history.replaceState(null, "", `?id=${L.id}#${name}`);
  }
  tabs.forEach(t => t.onclick = () => openTab(t.dataset.tab));
  const start = location.hash.slice(1);
  openTab(tabs.some(t => t.dataset.tab === start && !t.hidden) ? start : "vocab");

  // Ngữ âm, Bài khoá, Ngữ pháp, Bài tập
  $("phonetics").innerHTML = renderMarkup(L.phonetics);
  $("text").innerHTML = `
    <p><label><input type="checkbox" id="togglePy" checked> Hiện pinyin</label></p>
    ${renderMarkup(L.text)}`;
  $("togglePy").onchange = e => document.querySelectorAll("#text .text-py").forEach(el => el.hidden = !e.target.checked);
  $("grammar").innerHTML = renderMarkup(L.grammar);
  $("bookExercises").innerHTML = renderMarkup(L.exercises, L.answers);

  renderVocab(L);
  renderWriting(L);
  renderQuiz(L);
}

// ---------- Từ vựng ----------
function renderVocab(L) {
  const V = L.vocab;
  $("vocabTable").innerHTML = V.map((v, i) => `
    <tr><td class="muted">${i + 1}</td><td class="zh vocab-hz">${esc(v.hz)}</td><td>${esc(v.py)}</td>
      <td class="muted">${esc(v.hv)}</td><td class="muted">${esc(v.type)}</td><td>${esc(v.vi)}</td><td>${speakBtn(v.hz)}</td></tr>`).join("");

  const withStory = V.filter(v => v.story);
  $("storySection").hidden = withStory.length === 0;
  $("storyGrid").innerHTML = withStory.map(v => `
    <div class="story-card">
      <div class="story-head">
        <span class="zh story-hz">${esc(v.hz)}</span>
        <div><div class="py">${esc(v.py)} ${speakBtn(v.hz)}</div><b>${esc(v.vi)}</b></div>
      </div>
      ${v.parts ? `<div class="story-parts zh">🧩 ${esc(v.parts)}</div>` : ""}
      <details><summary>📖 Đọc câu chuyện</summary><p class="story-text">${esc(v.story)}</p></details>
    </div>`).join("");

  let card = 0;
  const flash = $("flash");
  function showCard() {
    const v = V[card];
    flash.classList.remove("flipped");
    $("fFront").textContent = v.hz;
    $("fPy").textContent = v.py;
    $("fHv").textContent = v.hv ? `(${v.hv})` : "";
    $("fVi").textContent = v.vi;
    $("cardCount").textContent = ` ${card + 1}/${V.length} `;
  }
  flash.onclick = () => { flash.classList.toggle("flipped"); speak(V[card].hz); };
  $("prevCard").onclick = () => { card = (card - 1 + V.length) % V.length; showCard(); };
  $("nextCard").onclick = () => { card = (card + 1) % V.length; showCard(); };
  if (V.length) showCard();
}

// ---------- Luyện viết (Hanzi Writer) ----------
function renderWriting(L) {
  let writer = null, outlineOn = true;
  const items = [];
  L.vocab.forEach(v => [...v.hz].filter(ch => CJK.test(ch)).forEach(ch => {
    if (!items.some(x => x.ch === ch)) items.push({ ch, word: v });
  }));
  function pick(i) {
    const it = items[i];
    document.querySelectorAll(".hw-char").forEach((b, j) => b.classList.toggle("active", i === j));
    $("hwWord").textContent = it.word.hz;
    $("hwPy").textContent = it.word.py;
    $("hwVi").textContent = it.word.vi;
    $("hwStory").textContent = it.word.story ? "💡 " + it.word.story : "";
    $("hwMsg").textContent = "";
    if (!window.HanziWriter) { $("hwMsg").textContent = "Cần kết nối Internet để tải dữ liệu nét chữ."; return; }
    $("hwTarget").innerHTML = ""; outlineOn = true;
    writer = HanziWriter.create("hwTarget", it.ch, {
      width: 260, height: 260, padding: 10, strokeColor: "#c8102e", radicalColor: "#9b0c23",
      showOutline: true, delayBetweenStrokes: 250,
      onLoadCharDataError: () => $("hwMsg").textContent = "Không tải được dữ liệu cho chữ này."
    });
  }
  $("hwChars").innerHTML = items.map((x, i) => `<button class="hw-char zh" data-i="${i}">${x.ch}</button>`).join("");
  document.querySelectorAll(".hw-char").forEach(b => b.onclick = () => pick(Number(b.dataset.i)));
  $("hwAnimate").onclick = () => writer && writer.animateCharacter();
  $("hwOutline").onclick = () => { if (!writer) return; outlineOn = !outlineOn; outlineOn ? writer.showOutline() : writer.hideOutline(); };
  $("hwQuiz").onclick = () => {
    if (!writer) return;
    const msg = $("hwMsg");
    msg.textContent = "Hãy viết từng nét theo đúng thứ tự…";
    writer.quiz({
      onMistake: s => msg.innerHTML = `<span class="fb-bad">Sai nét ${s.strokeNum + 1}, thử lại!</span>`,
      onCorrectStroke: s => msg.innerHTML = `<span class="fb-ok">Đúng nét ${s.strokeNum + 1}/${s.strokeNum + 1 + s.strokesRemaining}</span>`,
      onComplete: s => msg.innerHTML = `<span class="fb-ok">🎉 Hoàn thành! Sai ${s.totalMistakes} lần.</span>`
    });
  };
  // Chỉ tạo khung viết khi mở tab (tránh tải dữ liệu không cần thiết)
  document.querySelector('[data-tab="write"]').addEventListener("click", () => { if (!writer && items.length) pick(0); });
  if (location.hash === "#write" && items.length) pick(0);
}

// ---------- Trắc nghiệm từ vựng ----------
function renderQuiz(L) {
  const shuffle = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const pool = L.vocab.filter(v => v.vi);
  const quiz = shuffle(pool).map(v => ({
    hz: v.hz, answer: v.vi,
    options: shuffle([v.vi, ...shuffle([...new Set(pool.filter(o => o.vi !== v.vi).map(o => o.vi))]).slice(0, 3)])
  }));
  const answers = {};
  $("quiz").innerHTML = quiz.map((q, i) => `
    <div class="box"><b>${i + 1}.</b> <span class="zh" style="font-size:1.4rem">${esc(q.hz)}</span>
      <div class="opts">${q.options.map(o => `<button class="opt" data-q="${i}">${esc(o)}</button>`).join("")}</div>
    </div>`).join("");
  document.querySelectorAll(".opt").forEach(btn => btn.onclick = () => {
    btn.parentElement.querySelectorAll(".opt").forEach(b => b.classList.remove("picked"));
    btn.classList.add("picked");
    answers[btn.dataset.q] = btn.textContent;
  });
  $("submitBtn").onclick = () => {
    let correct = 0;
    quiz.forEach((q, i) => {
      document.querySelectorAll(`.opt[data-q="${i}"]`).forEach(b => {
        if (b.textContent === q.answer) b.classList.add("ok");
        else if (b.textContent === answers[i]) b.classList.add("bad");
      });
      if (answers[i] === q.answer) correct++;
    });
    const pct = Math.round(correct / quiz.length * 100);
    const progress = getProgress();
    progress[L.id] = { best: Math.max(pct, progress[L.id]?.best || 0), last: pct };
    saveProgress(progress);
    $("result").textContent = `Kết quả: ${correct}/${quiz.length} câu đúng (${pct}%)`;
  };
}
