const KEY = "deal_checker_v1";
const KEY_SETTINGS = "deal_checker_settings_v1";

const $ = (id) => document.getElementById(id);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadDeals() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function saveDeals(deals) {
  localStorage.setItem(KEY, JSON.stringify(deals));
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY_SETTINGS) || "{}"); }
  catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
}

function discountPct(fb, shopee) {
  fb = Number(fb); shopee = Number(shopee);
  if (!shopee || shopee <= 0) return null;
  return (1 - (fb / shopee)) * 100;
}

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(1);
}

let deals = loadDeals();
let editingId = null;

// Elements
const listEl = $("list");
const emptyEl = $("empty");

const thresholdEl = $("threshold");
const onlyPassEl = $("onlyPass");
const searchEl = $("search");
const statusFilterEl = $("statusFilter");
const sortEl = $("sort");

const modalEl = $("modal");
const modalTitleEl = $("modalTitle");
const btnAdd = $("btnAdd");
const btnClose = $("btnClose");
const btnSave = $("btnSave");
const btnDelete = $("btnDelete");

const fTitle = $("fTitle");
const fFb = $("fFb");
const fShopee = $("fShopee");
const fFbLink = $("fFbLink");
const fShopeeLink = $("fShopeeLink");
const fStatus = $("fStatus");
const fNote = $("fNote");
const calcHint = $("calcHint");

const btnExport = $("btnExport");
const importFile = $("importFile");
const btnClear = $("btnClear");

function applySettings() {
  const s = loadSettings();
  if (s.threshold !== undefined) thresholdEl.value = s.threshold;
  if (s.onlyPass !== undefined) onlyPassEl.checked = s.onlyPass;
  if (s.sort) sortEl.value = s.sort;
}

function persistSettings() {
  saveSettings({
    threshold: Number(thresholdEl.value || 70),
    onlyPass: !!onlyPassEl.checked,
    sort: sortEl.value
  });
}

function openModal(mode, deal = null) {
  modalEl.classList.remove("hidden");
  modalEl.setAttribute("aria-hidden", "false");

  if (mode === "add") {
    editingId = null;
    modalTitleEl.textContent = "Add deal";
    btnDelete.classList.add("hidden");
    fTitle.value = "";
    fFb.value = "";
    fShopee.value = "";
    fFbLink.value = "";
    fShopeeLink.value = "";
    fStatus.value = "Interested";
    fNote.value = "";
    calcHint.textContent = "Discount: —";
  } else {
    editingId = deal.id;
    modalTitleEl.textContent = "Edit deal";
    btnDelete.classList.remove("hidden");
    fTitle.value = deal.title || "";
    fFb.value = deal.fb_price ?? "";
    fShopee.value = deal.shopee_price ?? "";
    fFbLink.value = deal.fb_link || "";
    fShopeeLink.value = deal.shopee_link || "";
    fStatus.value = deal.status || "Interested";
    fNote.value = deal.note || "";
    const d = discountPct(fFb.value, fShopee.value);
    calcHint.textContent = `Discount: ${fmt(d)}%`;
  }
}

function closeModal() {
  modalEl.classList.add("hidden");
  modalEl.setAttribute("aria-hidden", "true");
}

function upCalcHint() {
  const d = discountPct(fFb.value, fShopee.value);
  calcHint.textContent = `Discount: ${fmt(d)}%`;
}

function render() {
  const threshold = Number(thresholdEl.value || 70);
  const onlyPass = onlyPassEl.checked;
  const q = (searchEl.value || "").trim().toLowerCase();
  const statusF = statusFilterEl.value;

  let view = deals.slice();

  // filter
  view = view.filter(d => {
    const titleOk = !q || (d.title || "").toLowerCase().includes(q);
    const statusOk = !statusF || d.status === statusF;
    const disc = discountPct(d.fb_price, d.shopee_price);
    const passOk = !onlyPass || (disc !== null && disc >= threshold);
    return titleOk && statusOk && passOk;
  });

  // sort
  const sort = sortEl.value;
  if (sort === "disc_desc") {
    view.sort((a,b) => (discountPct(b.fb_price,b.shopee_price) ?? -999) - (discountPct(a.fb_price,a.shopee_price) ?? -999));
  } else if (sort === "fb_asc") {
    view.sort((a,b) => (Number(a.fb_price) || 0) - (Number(b.fb_price) || 0));
  } else {
    view.sort((a,b) => (b.created_at || 0) - (a.created_at || 0));
  }

  listEl.innerHTML = "";
  emptyEl.classList.toggle("hidden", deals.length !== 0);

  for (const d of view) {
    const disc = discountPct(d.fb_price, d.shopee_price);
    const pass = disc !== null && disc >= threshold;

    const item = document.createElement("div");
    item.className = "item";

    const left = document.createElement("div");
    left.className = "left";
    left.innerHTML = `
      <div class="title">${escapeHtml(d.title || "(no title)")}</div>
      <div class="meta">
        <span class="badge ${pass ? "pass" : ""}">-${fmt(disc)}%</span>
        <span>FB: ฿${escapeHtml(String(d.fb_price ?? ""))}</span>
        <span>Shopee: ฿${escapeHtml(String(d.shopee_price ?? ""))}</span>
        <span>Status: ${escapeHtml(d.status || "—")}</span>
      </div>
      <div class="meta">
        ${d.fb_link ? `<a class="link" target="_blank" rel="noreferrer" href="${escapeAttr(d.fb_link)}">Open FB</a>` : ""}
        ${d.shopee_link ? `<a class="link" target="_blank" rel="noreferrer" href="${escapeAttr(d.shopee_link)}">Open Shopee</a>` : ""}
        ${d.note ? `<span>Note: ${escapeHtml(d.note)}</span>` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn";
    btnEdit.textContent = "Edit";
    btnEdit.onclick = () => openModal("edit", d);

    actions.appendChild(btnEdit);
    item.appendChild(left);
    item.appendChild(actions);
    listEl.appendChild(item);
  }

  persistSettings();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

// Events
btnAdd.onclick = () => openModal("add");
btnClose.onclick = closeModal;
modalEl.addEventListener("click", (e) => { if (e.target === modalEl) closeModal(); });

[fFb, fShopee].forEach(el => el.addEventListener("input", upCalcHint));

btnSave.onclick = () => {
  const title = (fTitle.value || "").trim();
  const fb = Number(fFb.value || 0);
  const shopee = Number(fShopee.value || 0);

  const row = {
    id: editingId || uid(),
    title,
    fb_price: fb,
    shopee_price: shopee,
    fb_link: (fFbLink.value || "").trim(),
    shopee_link: (fShopeeLink.value || "").trim(),
    status: fStatus.value,
    note: (fNote.value || "").trim(),
    created_at: editingId ? (deals.find(x => x.id === editingId)?.created_at || Date.now()) : Date.now()
  };

  if (!title) { alert("กรุณาใส่ชื่อหนังสือ/คีย์เวิร์ด"); return; }

  if (editingId) {
    deals = deals.map(d => d.id === editingId ? row : d);
  } else {
    deals = [row, ...deals];
  }
  saveDeals(deals);
  closeModal();
  render();
};

btnDelete.onclick = () => {
  if (!editingId) return;
  if (!confirm("Delete this deal?")) return;
  deals = deals.filter(d => d.id !== editingId);
  saveDeals(deals);
  closeModal();
  render();
};

[thresholdEl, onlyPassEl, searchEl, statusFilterEl, sortEl].forEach(el => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

btnExport.onclick = () => {
  const header = ["id","created_at","title","fb_price","shopee_price","fb_link","shopee_link","status","note"];
  const lines = [header.join(",")];

  for (const d of deals) {
    const row = header.map(k => csvCell(d[k]));
    lines.push(row.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "deals.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

function csvCell(v) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

importFile.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  const rows = parseCSV(text);
  if (!rows.length) return;

  const header = rows[0].map(x => x.trim());
  const idx = (k) => header.indexOf(k);

  const imported = [];
  for (let i=1;i<rows.length;i++) {
    const r = rows[i];
    if (!r.length) continue;
    const obj = {
      id: r[idx("id")] || uid(),
      created_at: Number(r[idx("created_at")] || Date.now()),
      title: r[idx("title")] || "",
      fb_price: Number(r[idx("fb_price")] || 0),
      shopee_price: Number(r[idx("shopee_price")] || 0),
      fb_link: r[idx("fb_link")] || "",
      shopee_link: r[idx("shopee_link")] || "",
      status: r[idx("status")] || "Interested",
      note: r[idx("note")] || ""
    };
    if (obj.title.trim()) imported.push(obj);
  }

  // merge by id
  const map = new Map(deals.map(d => [d.id, d]));
  for (const d of imported) map.set(d.id, d);
  deals = Array.from(map.values()).sort((a,b) => (b.created_at||0)-(a.created_at||0));

  saveDeals(deals);
  e.target.value = "";
  render();
});

btnClear.onclick = () => {
  if (!confirm("Clear all deals on this device?")) return;
  deals = [];
  saveDeals(deals);
  render();
};

// Basic CSV parser (handles quoted cells)
function parseCSV(text) {
  const out = [];
  let row = [], cur = "", inQ = false;
  for (let i=0;i<text.length;i++) {
    const c = text[i], n = text[i+1];
    if (inQ) {
      if (c === '"' && n === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); out.push(row); row = []; cur = ""; }
      else if (c !== "\r") cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); out.push(row); }
  return out;
}

// init
applySettings();
render();
