// ===== Trang quản trị: sửa dữ liệu bài học và lưu thẳng lên GitHub =====
const $ = s => document.getElementById(s);
const pad = n => String(n).padStart(2, "0");
const CFG_KEY = "adminConfig", TOKEN_KEY = "adminToken", REMEMBER_KEY = "adminRemember";
const FIELDS = ["hz", "py", "hv", "type", "vi", "parts", "story"];
const MARKUP_TABS = ["phonetics", "text", "grammar", "exercises"];

// ---------- Cài đặt kết nối ----------
// Nếu trang đang chạy trên GitHub Pages (tentaikhoan.github.io/tenkho/) thì tự đoán tên tài khoản và tên kho
function guessRepo() {
  const host = location.hostname;
  if (!host.endsWith(".github.io")) return {};
  const owner = host.split(".")[0];
  const seg = location.pathname.split("/").filter(Boolean)[0];
  return { owner, repo: seg && !seg.endsWith(".html") ? seg : `${owner}.github.io` };
}
function loadCfg() {
  const c = JSON.parse(localStorage.getItem(CFG_KEY) || "{}"), g = guessRepo();
  return {
    owner: c.owner || g.owner || "", repo: c.repo || g.repo || "",
    branch: c.branch || "main", dir: c.dir || "",
    token: sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ""
  };
}
let cfg = loadCfg();
const connected = () => !!(cfg.owner && cfg.repo && cfg.token);

// ---------- GitHub ----------
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
function repoPath(p) {
  const d = cfg.dir.trim().replace(/^\/+|\/+$/g, "");
  return d ? `${d}/${p}` : p;
}
function apiUrl(p) {
  return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/` +
    repoPath(p).split("/").map(encodeURIComponent).join("/");
}
const GH_ERRORS = {
  401: "Mã truy cập sai hoặc đã hết hạn.",
  403: "Mã truy cập chưa có quyền ghi (cần Contents: Read and write), hoặc GitHub tạm chặn vì gửi quá nhiều yêu cầu.",
  404: "Không tìm thấy kho hoặc file. Kiểm tra lại tên tài khoản, tên kho, nhánh và thư mục.",
  409: "File vừa được sửa ở nơi khác. Bấm \"Tải lại bài\" rồi sửa lại.",
  422: "GitHub từ chối lưu (có thể file vừa được sửa ở nơi khác). Bấm \"Tải lại bài\" rồi thử lại."
};
async function gh(path, body) {
  let res;
  try {
    res = await fetch(apiUrl(path) + (body ? "" : `?ref=${encodeURIComponent(cfg.branch)}`), {
      method: body ? "PUT" : "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("Không kết nối được tới GitHub. Kiểm tra mạng Internet.");
  }
  if (!res.ok) throw new Error(GH_ERRORS[res.status] || `Lỗi GitHub (mã ${res.status}).`);
  return res.json();
}

// ---------- Đọc / ghi file dữ liệu ----------
const lessonPath = id => `data/bai${pad(id)}.js`;
const defaultHeader = L => `// Bài ${L.id}: ${L.title} – ${L.titleVi}\n// Câu chuyện nhớ chữ: điền vào "parts" và "story" của từng từ trong "vocab".\n`;

function parseLesson(text) {
  const i = text.indexOf("LESSON_DATA[");
  if (i < 0) throw new Error("File bài học không đúng định dạng.");
  const json = text.slice(text.indexOf("{", i), text.lastIndexOf("}") + 1);
  return { header: text.slice(0, i), data: JSON.parse(json) };
}
function serializeLesson(header, L) {
  // Dòng đầu luôn ghi đúng tên bài mới
  const lines = (header || defaultHeader(L)).split("\n");
  if (lines[0].startsWith("// Bài")) lines[0] = `// Bài ${L.id}: ${L.title} – ${L.titleVi}`;
  return lines.join("\n") + `LESSON_DATA[${L.id}] = ` + JSON.stringify(L, null, 1) + ";\n";
}
function loadViaScript(id) {      // dùng khi mở trang bằng file:// (không fetch được)
  return new Promise((ok, fail) => {
    delete LESSON_DATA[id];
    const s = document.createElement("script");
    s.src = `${lessonPath(id)}?t=${Date.now()}`;
    s.onload = () => { s.remove(); LESSON_DATA[id] ? ok(LESSON_DATA[id]) : fail(new Error("File bài học bị lỗi.")); };
    s.onerror = () => { s.remove(); fail(new Error("Không đọc được file bài học.")); };
    document.body.appendChild(s);
  });
}
async function readLesson(id) {
  if (connected()) {
    const j = await gh(lessonPath(id));
    return { ...parseLesson(b64decode(j.content)), sha: j.sha, source: "GitHub" };
  }
  try {
    const res = await fetch(`${lessonPath(id)}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw 0;
    return { ...parseLesson(await res.text()), sha: null, source: "trang web" };
  } catch {
    const data = await loadViaScript(id);
    return { header: "", data, sha: null, source: "máy tính" };
  }
}
function buildIndexText() {
  return "// Danh sách bài học (tự tạo từ giáo trình)\n" +
    `const LESSON_GROUPS = ${JSON.stringify(LESSON_GROUPS)};\n` +
    `const LESSONS = ${JSON.stringify(LESSONS, null, 1)};\n`;
}

// ---------- Trạng thái ----------
let cur = null;           // { id, header, data, sha }
let dirty = false;
let currentTab = "vocab";

function setStatus(msg, kind = "") { const s = $("status"); s.textContent = msg; s.className = "status " + kind; }
function setDirty(v) {
  dirty = v;
  const m = $("dirtyMsg");
  m.textContent = v ? "● Có thay đổi chưa lưu" : "Không có thay đổi chưa lưu";
  m.classList.toggle("dirty", v);
}
const touch = () => { if (!dirty) setDirty(true); };
window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

// ---------- Kết nối GitHub (giao diện) ----------
function showCfg() {
  $("cfgOwner").value = cfg.owner; $("cfgRepo").value = cfg.repo;
  $("cfgBranch").value = cfg.branch; $("cfgDir").value = cfg.dir;
  $("cfgToken").value = cfg.token;
  $("cfgRemember").checked = localStorage.getItem(REMEMBER_KEY) === "1";
  $("connState").textContent = connected()
    ? `· ✅ ${cfg.owner}/${cfg.repo} (${cfg.branch})`
    : "· ⚠️ Chưa kết nối: chỉ xem được và tải file về máy";
  $("saveBtn").disabled = !connected();
  $("saveBtn").title = connected() ? "Ctrl+S" : "Cần kết nối GitHub trước";
}
$("cfgSave").onclick = async () => {
  cfg = {
    owner: $("cfgOwner").value.trim(), repo: $("cfgRepo").value.trim(),
    branch: $("cfgBranch").value.trim() || "main", dir: $("cfgDir").value.trim(),
    token: $("cfgToken").value.trim()
  };
  const { token, ...rest } = cfg;
  localStorage.setItem(CFG_KEY, JSON.stringify(rest));
  const remember = $("cfgRemember").checked;
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
  if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  showCfg();
  if (!connected()) { setStatus("Cần điền tên tài khoản, tên kho và mã truy cập.", "bad"); return; }
  setStatus("Đang kiểm tra kết nối…");
  try {
    await gh("data/index.js");
    setStatus("✅ Kết nối GitHub thành công.", "ok");
    $("settingsBox").open = false;
    if (cur && !dirty) loadLesson(cur.id, true);
  } catch (e) { setStatus("❌ " + e.message, "bad"); }
};
$("cfgForget").onclick = () => {
  localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
  cfg.token = ""; showCfg(); setStatus("Đã xoá mã truy cập khỏi trình duyệt này.");
};

// ---------- Chọn bài ----------
function fillPicker() {
  $("lessonPick").innerHTML = LESSONS.map(l =>
    `<option value="${l.id}">Bài ${pad(l.id)} · ${esc(l.title)} · ${esc(l.titleVi)}</option>`).join("");
}
$("lessonPick").onchange = e => {
  const id = Number(e.target.value);
  if (dirty && !confirm("Bài đang mở có thay đổi chưa lưu. Bỏ các thay đổi đó?")) { e.target.value = cur.id; return; }
  loadLesson(id, true);
};
$("reloadBtn").onclick = () => {
  if (!cur) return;
  if (dirty && !confirm("Tải lại sẽ bỏ các thay đổi chưa lưu. Tiếp tục?")) return;
  loadLesson(cur.id, true);
};

async function loadLesson(id, force) {
  setStatus("Đang tải bài " + id + "…");
  try {
    const r = await readLesson(id);
    const L = r.data;
    L.vocab = (L.vocab || []).map(v => ({ ...Object.fromEntries(FIELDS.map(k => [k, ""])), ...v }));
    MARKUP_TABS.forEach(k => { if (typeof L[k] !== "string") L[k] = ""; });
    L.answers = L.answers || {};
    cur = { id, header: r.header, data: L, sha: r.sha };
    $("lessonPick").value = id;
    history.replaceState(null, "", `?id=${id}`);
    $("editor").hidden = false; $("saveBar").hidden = false;
    renderEditor();
    setDirty(false);
    setStatus(`Đã mở bài ${id} (đọc từ ${r.source}).`, "ok");
  } catch (e) { setStatus("❌ " + e.message, "bad"); }
}

// ---------- Trình sửa ----------
function renderEditor() {
  $("fTitle").value = cur.data.title || "";
  $("fTitleVi").value = cur.data.titleVi || "";
  renderVocabRows();
  renderAnswers();
  openTab(currentTab);
}
$("fTitle").oninput = e => { cur.data.title = e.target.value; touch(); };
$("fTitleVi").oninput = e => { cur.data.titleVi = e.target.value; touch(); };

const LESSON_TAB = { info: "vocab", vocab: "vocab", phonetics: "phonetics", text: "text", grammar: "grammar", exercises: "exercises", answers: "exercises" };
function openTab(name) {
  clearTimeout(previewTimer);
  currentTab = name;
  document.querySelectorAll("#tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  const panel = MARKUP_TABS.includes(name) ? "p-markup" : "p-" + name;
  document.querySelectorAll("#editor .panel").forEach(p => p.classList.toggle("active", p.id === panel));
  if (MARKUP_TABS.includes(name)) { $("markupBox").value = cur.data[name]; updatePreview(); }
  if (name === "answers") renderAnswers();
  $("viewBtn").href = `lesson.html?id=${cur.id}#${LESSON_TAB[name]}`;
}
document.querySelectorAll("#tabs .tab").forEach(t => t.onclick = () => openTab(t.dataset.tab));

// Ngữ âm / Bài khoá / Ngữ pháp / Bài tập: ô soạn + xem trước
let previewTimer;
function updatePreview() {
  if (!MARKUP_TABS.includes(currentTab)) return;
  $("markupPreview").innerHTML = renderMarkup(cur.data[currentTab], currentTab === "exercises" ? cur.data.answers : {});
  $("markupPreview").querySelectorAll("details.answer").forEach(d => d.open = true);
}
$("markupBox").oninput = e => {
  cur.data[currentTab] = e.target.value; touch();
  clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 250);
};

// Từ vựng
function renderVocabRows() {
  $("vocabRows").innerHTML = cur.data.vocab.map((v, i) => `
    <tr>
      <td class="muted">${i + 1}</td>
      ${FIELDS.map(k => k === "story"
        ? `<td class="c-story"><textarea data-i="${i}" data-k="story" rows="1" placeholder="Câu chuyện…">${esc(v.story)}</textarea></td>`
        : `<td class="c-${k}"><input data-i="${i}" data-k="${k}" value="${esc(v[k])}" class="${k === "hz" || k === "parts" ? "zh" : ""}"></td>`).join("")}
      <td class="row-btns">
        <button data-act="up" data-i="${i}" title="Lên">↑</button><button data-act="down" data-i="${i}" title="Xuống">↓</button>
        <button data-act="del" data-i="${i}" class="del" title="Xoá từ">✕</button>
      </td>
    </tr>`).join("");
  $("vocabRows").querySelectorAll("textarea").forEach(autoGrow);
}
function autoGrow(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
$("vocabRows").addEventListener("input", e => {
  const el = e.target, i = Number(el.dataset.i);
  if (!el.dataset.k) return;
  cur.data.vocab[i][el.dataset.k] = el.value; touch();
  if (el.tagName === "TEXTAREA") autoGrow(el);
});
$("vocabRows").addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const V = cur.data.vocab, i = Number(b.dataset.i);
  if (b.dataset.act === "del") {
    if (V[i].hz && !confirm(`Xoá từ "${V[i].hz}"?`)) return;
    V.splice(i, 1);
  } else {
    const j = b.dataset.act === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= V.length) return;
    [V[i], V[j]] = [V[j], V[i]];
  }
  touch(); renderVocabRows();
});
$("addWord").onclick = () => {
  cur.data.vocab.push(Object.fromEntries(FIELDS.map(k => [k, ""])));
  touch(); renderVocabRows();
  const inputs = $("vocabRows").querySelectorAll('input[data-k="hz"]');
  inputs[inputs.length - 1].focus();
};

// Đáp án
const sortedKeys = () => Object.keys(cur.data.answers).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
function renderAnswers() {
  const A = cur.data.answers, ex = cur.data.exercises;
  $("answerList").innerHTML = sortedKeys().map(k => {
    const linked = new RegExp(`^@answers ${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(ex);
    return `
    <div class="answer-card" data-key="${esc(k)}">
      <div class="head">
        <label>Bài tập số <input class="a-num" value="${esc(k)}"></label>
        <input class="a-title" value="${esc(A[k].title || "")}" placeholder="Tên bài tập">
        <button class="btn secondary a-del">Xoá</button>
      </div>
      <textarea class="a-lines zh" placeholder="Mỗi dòng một câu đáp án">${esc((A[k].lines || []).join("\n"))}</textarea>
      ${linked ? "" : `<p class="fb-bad">⚠️ Tab Bài tập chưa có dòng <code>@answers ${esc(k)}</code> nên đáp án này chưa hiện trên web.</p>`}
    </div>`;
  }).join("") || `<p class="muted">Bài này chưa có đáp án nào.</p>`;
}
$("answerList").addEventListener("input", e => {
  const card = e.target.closest(".answer-card"), k = card.dataset.key, a = cur.data.answers[k];
  if (e.target.classList.contains("a-title")) a.title = e.target.value;
  else if (e.target.classList.contains("a-lines")) a.lines = e.target.value.split("\n");
  else return;
  touch();
});
$("answerList").addEventListener("change", e => {
  if (!e.target.classList.contains("a-num")) return;
  const card = e.target.closest(".answer-card"), k = card.dataset.key, nk = e.target.value.trim();
  if (nk === k) return;
  if (!nk || cur.data.answers[nk]) { alert(nk ? `Đã có đáp án cho bài tập số ${nk}.` : "Số bài tập không được để trống."); e.target.value = k; return; }
  cur.data.answers[nk] = cur.data.answers[k]; delete cur.data.answers[k];
  touch(); renderAnswers();
});
$("answerList").addEventListener("click", e => {
  if (!e.target.classList.contains("a-del")) return;
  const k = e.target.closest(".answer-card").dataset.key;
  if (!confirm(`Xoá đáp án của bài tập số ${k}?`)) return;
  delete cur.data.answers[k]; touch(); renderAnswers();
});
$("addAnswer").onclick = () => {
  const nums = Object.keys(cur.data.answers).map(Number).filter(n => !isNaN(n));
  const k = String(nums.length ? Math.max(...nums) + 1 : 1);
  cur.data.answers[k] = { title: "", lines: [] };
  touch(); renderAnswers();
};

// ---------- Lưu ----------
function cleanData() {
  const L = cur.data;
  L.vocab = L.vocab.filter(v => FIELDS.some(k => String(v[k]).trim()));          // bỏ dòng trống hoàn toàn
  L.vocab.forEach(v => FIELDS.forEach(k => v[k] = String(v[k]).trim()));
  Object.values(L.answers).forEach(a => a.lines = (a.lines || []).map(s => s.trimEnd()).filter(s => s.trim()));
  return L;
}
function indexEntryChanged(L) {
  const e = LESSONS.find(x => x.id === L.id);
  return e && (e.title !== L.title || e.titleVi !== L.titleVi || e.words !== L.vocab.length);
}
function applyIndexEntry(arr, L) {
  const e = arr.find(x => x.id === L.id);
  if (e) { e.title = L.title; e.titleVi = L.titleVi; e.words = L.vocab.length; }
}

async function save() {
  if (!cur) return;
  if (!connected()) { $("settingsBox").open = true; setStatus("Cần kết nối GitHub trước khi lưu (hoặc bấm \"Tải file về\").", "bad"); return; }
  const btn = $("saveBtn"); btn.disabled = true;
  setStatus("Đang lưu lên GitHub…");
  try {
    const L = cleanData();
    const path = lessonPath(L.id);
    if (!cur.sha) cur.sha = (await gh(path)).sha;   // bài được mở khi chưa kết nối
    const r = await gh(path, {
      message: `Sửa nội dung bài ${L.id}`, content: b64encode(serializeLesson(cur.header, L)),
      sha: cur.sha, branch: cfg.branch
    });
    cur.sha = r.content.sha;

    // Cập nhật danh sách bài (tên bài, số từ) nếu thay đổi
    if (indexEntryChanged(L)) {
      const f = await gh("data/index.js"), text = b64decode(f.content);
      const i = text.indexOf("const LESSONS"), s = text.indexOf("[", i), end = text.lastIndexOf("]");
      const arr = JSON.parse(text.slice(s, end + 1));
      applyIndexEntry(arr, L);
      await gh("data/index.js", {
        message: `Cập nhật danh sách bài (bài ${L.id})`,
        content: b64encode(text.slice(0, s) + JSON.stringify(arr, null, 1) + text.slice(end + 1)),
        sha: f.sha, branch: cfg.branch
      });
      applyIndexEntry(LESSONS, L);
      fillPicker(); $("lessonPick").value = L.id;
    }
    renderEditor(); setDirty(false);
    const t = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setStatus(`✅ Đã lưu lúc ${t}. Trang web sẽ cập nhật sau khoảng 1–2 phút.`, "ok");
  } catch (e) {
    setStatus("❌ " + e.message, "bad");
  } finally { btn.disabled = !connected(); }
}
$("saveBtn").onclick = save;
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
});

// Tải file về máy (khi chưa kết nối GitHub, rồi tự đưa lên GitHub)
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("downloadBtn").onclick = () => {
  if (!cur) return;
  const L = cleanData();
  download(`bai${pad(L.id)}.js`, serializeLesson(cur.header, L));
  if (indexEntryChanged(L)) {
    applyIndexEntry(LESSONS, L);
    setTimeout(() => download("index.js", buildIndexText()), 400);
    fillPicker(); $("lessonPick").value = L.id;
  }
  renderEditor();
  setStatus(`Đã tải file về. Chép vào thư mục data/ của dự án (thay file cũ).`, "ok");
};

// ---------- Khởi động ----------
fillPicker();
showCfg();
$("settingsBox").open = !connected();
loadLesson(Number(new URLSearchParams(location.search).get("id")) || 1);
