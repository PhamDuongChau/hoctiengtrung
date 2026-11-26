// ===== Dùng chung: hiển thị nội dung bài (trang bài học + trang quản trị) =====
// ---------- Tiện ích ----------
const CJK = /[㐀-鿿]/;
const VI_ONLY = /[ăâđêôơưĂÂĐÊÔƠƯảãạẻẽẹỉĩịỏõọủũụỷỹỵỳýằắẳẵặầấẩẫậềếểễệồốổỗộờớởỡợừứửữự]/;
const PY_ONLY = /[āēīōūǎěǐǒǔǖǘǚǜüĀĒĪŌŪ]/;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isPinyin = s => !CJK.test(s) && !VI_ONLY.test(s) && PY_ONLY.test(s);
const zhOnly = s => s.replace(/[^㐀-鿿，。！？、；：]/g, "");

// Phát âm bằng giọng đọc có sẵn của trình duyệt
function speak(text) {
  const t = zhOnly(text);
  if (!t) return;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "zh-CN"; u.rate = 0.8;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const speakBtn = t => `<button class="speak" title="Nghe" data-say="${esc(t)}">🔊</button>`;
document.addEventListener("click", e => {
  const b = e.target.closest("[data-say]");
  if (b) speak(b.dataset.say);
});

// Ô trống "____" trong sách -> ô nhập
const blanks = s => esc(s).replace(/_{3,}/g, '<input class="blank" aria-label="Điền vào chỗ trống">');

// ---------- Hiển thị nội dung dạng chữ (ngữ âm, ngữ pháp, bài tập) ----------
function renderLine(s) {
  if (CJK.test(s) && !VI_ONLY.test(s.replace(/[㐀-鿿]/g, "")) && /[㐀-鿿]{2,}/.test(s))
    return `<p class="zh-line zh">${blanks(s)} ${speakBtn(s)}</p>`;
  if (isPinyin(s)) return `<p class="py">${blanks(s)}</p>`;
  if (/^[■▲●·•]/.test(s)) return `<p class="bullet">${blanks(s)}</p>`;
  if (/^(Ví dụ|VD)\s*:?$/i.test(s)) return `<p class="label">${esc(s)}</p>`;
  return `<p>${blanks(s)}</p>`;
}

function renderCell(c) {
  if (CJK.test(c)) return `<td class="zh say" data-say="${esc(c)}">${blanks(c)}</td>`;
  if (isPinyin(c)) return `<td class="py">${blanks(c)}</td>`;
  return `<td>${blanks(c)}</td>`;
}

function renderMarkup(text, answers = {}) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "", i = 0;
  while (i < lines.length) {
    const s = lines[i];
    if (s.startsWith("| ")) {                       // bảng
      let rows = "";
      while (i < lines.length && lines[i].startsWith("| ")) {
        rows += "<tr>" + lines[i].slice(2).split(" | ").map(renderCell).join("") + "</tr>";
        i++;
      }
      html += `<div class="table-wrap"><table class="md-table">${rows}</table></div>`;
      continue;
    }
    if (s.startsWith("> ")) {                       // hội thoại / đoạn văn
      let box = "";
      while (i < lines.length && lines[i].startsWith("> ")) {
        const [who, zh, py] = lines[i].slice(2).split("|").map(x => (x || "").trim());
        box += `<div class="line">${who ? `<div class="who">${esc(who)}</div>` : ""}<div>
          <div class="zh text-zh">${esc(zh)} ${speakBtn(zh)}</div><div class="py text-py">${esc(py)}</div></div></div>`;
        i++;
      }
      html += `<div class="box dialog">${box}</div>`;
      continue;
    }
    if (s.startsWith("### ")) html += `<h4>${esc(s.slice(4))}</h4>`;
    else if (s.startsWith("## ")) html += `<h3>${esc(s.slice(3))}</h3>`;
    else if (s === "---") html += "<hr>";
    else if (s === "?") html += `<textarea class="answer-box" rows="2" placeholder="Viết câu trả lời…"></textarea>`;
    else if (s.startsWith("@answers ")) {
      const a = answers[s.slice(9).trim()];
      if (a) html += `<details class="answer"><summary>✅ Xem đáp án</summary><pre class="zh">${esc(a.lines.join("\n"))}</pre></details>`;
    }
    else html += renderLine(s);
    i++;
  }
  return html;
}
