"use strict";

let currentPath = "";
let filesData   = [];
let sortKey     = "name";
let sortDir     = "asc";

// ── LOAD ──────────────────────────────────────────────────
function load() {
  fetch(`/api/list?path=${encodeURIComponent(currentPath)}`)
    .then(r => r.json())
    .then(data => {
      filesData = data;
      // re-apply current sort after load
      const sel = document.getElementById("sort-select");
      if (sel && sel.value !== "name-asc") { applySort(); } else { renderFiles(data); }
      renderBreadcrumb();
      renderSidebar();
    })
    .catch(() => showToast("Could not load folder", "error"));
}

// ── RENDER FILES ──────────────────────────────────────────
function renderFiles(data) {
  const container  = document.getElementById("files");
  const emptyState = document.getElementById("empty-state");
  container.innerHTML = "";

  if (!data.length) {
    emptyState.style.display = "";
    return;
  }
  emptyState.style.display = "none";

  // batch render for performance
  let idx = 0;
  function batch() {
    data.slice(idx, idx + 60).forEach(f => container.appendChild(buildCard(f)));
    idx += 60;
  }
  batch();
  document.getElementById("files-area").onscroll = e => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) batch();
  };
}

function buildCard(f) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.name = f.name;

  // type color
  const color = typeColor(f);
  card.style.setProperty("--type-color", color);

  card.innerHTML = `
    <div class="card-thumb">${thumbHtml(f)}</div>
    <div class="card-info">
      <div class="card-name" title="${esc(f.name)}">${esc(f.name)}</div>
      <div class="card-meta">${f.type === "folder" ? "Folder" : fmtSize(f.size)}</div>
    </div>`;

  // hover scrub for video — fixed: no load() on mouseleave
  if (isVideo(f.name)) {
    const thumb = card.querySelector(".card-thumb");
    let vid = null;
    thumb.addEventListener("mouseenter", () => {
      vid = document.createElement("video");
      vid.src     = `/api/file?path=${encodeURIComponent(currentPath ? currentPath + "/" + f.name : f.name)}`;
      vid.muted   = true;
      vid.loop    = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
      thumb.style.position = "relative";
      thumb.appendChild(vid);
    });
    thumb.addEventListener("mouseleave", () => {
      if (vid) { vid.pause(); vid.src = ""; vid.remove(); vid = null; }
    });
  }

  card.addEventListener("click",       () => openItem(f));
  card.addEventListener("contextmenu", e  => showCtxMenu(e, f));
  return card;
}

function thumbHtml(f) {
  const path = encodeURIComponent(currentPath ? currentPath + "/" + f.name : f.name);
  if (f.type === "folder") return `<svg viewBox="0 0 40 32" fill="none" width="40"><path d="M2 8a3 3 0 013-3h10l3 4h17a3 3 0 013 3v16a3 3 0 01-3 3H5a3 3 0 01-3-3V8z" fill="#3d3480" opacity=".7"/><path d="M2 14a3 3 0 013-3h30a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V14z" fill="#7c5cfc" opacity=".8"/></svg>`;
  if (isImage(f.name)) return `<img src="/api/file?path=${path}" loading="lazy" alt="${esc(f.name)}">`;
  const ext = f.name.split(".").pop().toUpperCase().slice(0, 4);
  return `<span class="ext-badge">${ext}</span>`;
}

// ── OPEN ITEM ─────────────────────────────────────────────
function openItem(f) {
  if (f.type === "folder") {
    currentPath = currentPath ? currentPath + "/" + f.name : f.name;
    load();
  } else {
    openPreview(f);
  }
}

// ── PREVIEW ───────────────────────────────────────────────
function openPreview(f) {
  const path    = currentPath ? currentPath + "/" + f.name : f.name;
  const url     = `/api/file?path=${encodeURIComponent(path)}`;
  const ext     = f.name.split(".").pop().toLowerCase();
  const overlay = document.getElementById("preview-overlay");
  const nameEl  = document.getElementById("preview-name");
  const content = document.getElementById("preview-content");

  nameEl.textContent = f.name;
  content.innerHTML  = "";

  if (["mp4", "webm", "mov", "mkv"].includes(ext)) {
    const v = document.createElement("video");
    v.src = url; v.controls = true; v.autoplay = true;
    content.appendChild(v);

  } else if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    const img = document.createElement("img");
    img.src = url; img.alt = f.name;
    content.appendChild(img);

  } else if (["mp3", "wav", "ogg", "flac", "aac", "m4a", "opus"].includes(ext)) {
    // music player UI
    content.innerHTML = `
      <div class="audio-player">
        <div class="audio-icon">
          <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
            <circle cx="32" cy="32" r="30" fill="#7c5cfc" opacity=".15"/>
            <path d="M24 20v24l18-12-18-12z" fill="#7c5cfc"/>
          </svg>
        </div>
        <div class="audio-title">${esc(f.name)}</div>
        <audio id="audio-el" controls autoplay src="${url}"></audio>
      </div>`;

  } else if (ext === "pdf") {
    const fr = document.createElement("iframe");
    fr.src = url; content.appendChild(fr);

  } else if (["txt","md","js","ts","py","json","css","html","xml","sh","yaml","yml","csv","log","env","ini","conf","toml"].includes(ext)) {
    fetch(url)
      .then(r => r.text())
      .then(txt => {
        const pre = document.createElement("pre");
        pre.textContent = txt.slice(0, 200_000);
        content.appendChild(pre);
      })
      .catch(() => { content.textContent = "Could not load file."; });

  } else {
    content.innerHTML = `
      <div class="no-preview">
        <div class="ext-badge-lg">${ext.toUpperCase()}</div>
        <div>${esc(f.name)}</div>
        <div class="meta-val">${fmtSize(f.size)}</div>
        <a class="dl-btn" href="/api/download?path=${encodeURIComponent(path)}" download>Download</a>
      </div>`;
  }

  overlay.classList.add("open");
}

function closePreview() {
  const overlay = document.getElementById("preview-overlay");
  overlay.classList.remove("open");
  // stop any playing media
  overlay.querySelectorAll("video, audio").forEach(m => { m.pause(); m.src = ""; });
  setTimeout(() => {
    document.getElementById("preview-content").innerHTML = "";
  }, 200);
}

// close on Escape
document.addEventListener("keydown", e => { if (e.key === "Escape") closePreview(); });

// ── BREADCRUMB ────────────────────────────────────────────
function renderBreadcrumb() {
  const el = document.getElementById("breadcrumb-parts");
  el.innerHTML = "";
  if (!currentPath) {
    const s = document.createElement("span");
    s.className = "bc-part bc-current"; s.textContent = "Root";
    el.appendChild(s); return;
  }
  const root = document.createElement("span");
  root.className = "bc-part"; root.textContent = "Root";
  root.onclick = () => { currentPath = ""; load(); };
  el.appendChild(root);
  const parts = currentPath.split("/");
  parts.forEach((p, i) => {
    const sep = document.createElement("span");
    sep.className = "bc-sep"; sep.textContent = "/";
    el.appendChild(sep);
    const seg = document.createElement("span");
    const last = i === parts.length - 1;
    seg.className = "bc-part" + (last ? " bc-current" : "");
    seg.textContent = p;
    if (!last) seg.onclick = () => { currentPath = parts.slice(0, i + 1).join("/"); load(); };
    el.appendChild(seg);
  });
}

function goRoot() { currentPath = ""; load(); }

// ── SIDEBAR ───────────────────────────────────────────────
function renderSidebar() {
  const tree = document.getElementById("sidebar-tree");
  tree.innerHTML = "";
  const folders = filesData.filter(f => f.type === "folder");
  if (!folders.length) return;
  folders.forEach(f => {
    const el = document.createElement("div");
    el.className = "tree-item";
    el.innerHTML = `<svg viewBox="0 0 16 14" fill="none" width="13" height="13"><path d="M1 3.5A1.5 1.5 0 012.5 2h4l1.5 2H14a1.5 1.5 0 011.5 1.5v7A1.5 1.5 0 0114 14H2.5A1.5 1.5 0 011 12.5v-9z" fill="#7c5cfc" opacity=".6"/></svg>${esc(f.name)}`;
    el.onclick = () => { currentPath = currentPath ? currentPath + "/" + f.name : f.name; load(); };
    tree.appendChild(el);
  });
}

// ── UPLOAD ────────────────────────────────────────────────
function upload() { fileInput.value = ""; fileInput.click(); }

document.getElementById("fileInput").onchange = e => uploadFiles(e.target.files);

const filesArea = document.getElementById("files-area");
const dropOv    = document.getElementById("drop-overlay");
filesArea.addEventListener("dragover",  e => { e.preventDefault(); dropOv.classList.add("active"); });
filesArea.addEventListener("dragleave", e => { if (!filesArea.contains(e.relatedTarget)) dropOv.classList.remove("active"); });
filesArea.addEventListener("drop",      e => { e.preventDefault(); dropOv.classList.remove("active"); uploadFiles(e.dataTransfer.files); });

function uploadFiles(files) {
  [...files].forEach(file => {
    const toast = makeUploadToast(file.name);
    const fd    = new FormData();
    fd.append("file", file);
    fd.append("path", currentPath);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) toast.fill.style.width = Math.round(e.loaded / e.total * 100) + "%";
    };
    xhr.onload = () => {
      toast.fill.style.width = "100%";
      setTimeout(() => toast.el.remove(), 1500);
      load();
    };
    xhr.onerror = () => { toast.el.remove(); showToast("Upload failed", "error"); };
    xhr.send(fd);
  });
}

// ── SEARCH ────────────────────────────────────────────────
const TYPE_MAP = {
  video: /\.(mp4|webm|mov|mkv)$/i,
  image: /\.(jpg|jpeg|png|gif|webp)$/i,
  audio: /\.(mp3|wav|ogg|flac|aac|m4a)$/i,
  doc:   /\.(pdf|txt|md)$/i
};

document.getElementById("search").addEventListener("input", function() {
  const q = this.value.toLowerCase().trim();
  if (!q) { renderFiles(filesData); return; }
  const result = filesData.filter(f => {
    if (f.name.toLowerCase().includes(q)) return true;
    if (/video|movie/.test(q))   return TYPE_MAP.video.test(f.name);
    if (/image|photo/.test(q))   return TYPE_MAP.image.test(f.name);
    if (/song|music|audio/.test(q)) return TYPE_MAP.audio.test(f.name);
    return false;
  });
  renderFiles(result);
});

// ── CONTEXT MENU ──────────────────────────────────────────
let ctxTarget = null;
const ctxMenu = document.getElementById("ctx-menu");

function showCtxMenu(e, f) {
  e.preventDefault();
  ctxTarget = f;
  const x = Math.min(e.clientX, window.innerWidth  - 170);
  const y = Math.min(e.clientY, window.innerHeight - 130);
  ctxMenu.style.cssText = `display:block;left:${x}px;top:${y}px`;
}

function hideCtxMenu() { ctxMenu.style.display = "none"; ctxTarget = null; }
document.addEventListener("click", hideCtxMenu);

function ctxOpen() {
  if (ctxTarget) openItem(ctxTarget);
}

function ctxDownload() {
  if (!ctxTarget || ctxTarget.type === "folder") return;
  const path = currentPath ? currentPath + "/" + ctxTarget.name : ctxTarget.name;
  const a = document.createElement("a");
  a.href = `/api/download?path=${encodeURIComponent(path)}`; a.download = ""; a.click();
}

function ctxDelete() {
  if (!ctxTarget) return;
  const f    = ctxTarget;
  const path = currentPath ? currentPath + "/" + f.name : f.name;
  if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
  fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: [path] })
  }).then(() => load()).catch(() => showToast("Delete failed", "error"));
}

function ctxRename() {
  if (!ctxTarget) return;
  const f    = ctxTarget;
  const name = prompt("Rename to:", f.name);
  if (!name || name === f.name) return;
  const path = currentPath ? currentPath + "/" + f.name : f.name;
  fetch("/api/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name })
  }).then(() => load()).catch(() => showToast("Rename failed", "error"));
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const tc  = document.getElementById("toast-container");
  const el  = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  tc.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 200); }, 2500);
}

function makeUploadToast(name) {
  const tc   = document.getElementById("toast-container");
  const el   = document.createElement("div");
  el.className = "toast upload-toast";
  el.innerHTML = `<div style="font-size:12px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</div><div class="upload-prog-bar"><div class="upload-prog-fill"></div></div>`;
  tc.appendChild(el);
  return { el, fill: el.querySelector(".upload-prog-fill") };
}

// ── HELPERS ───────────────────────────────────────────────
function isImage(n) { return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(n); }
function isVideo(n) { return /\.(mp4|webm|mov|mkv|m4v)$/i.test(n); }

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function fmtSize(b) {
  if (!b) return "—";
  if (b < 1024)       return b + " B";
  if (b < 1048576)    return (b / 1024).toFixed(1) + " KB";
  if (b < 1073741824) return (b / 1048576).toFixed(1) + " MB";
  return (b / 1073741824).toFixed(2) + " GB";
}

function typeColor(f) {
  if (f.type === "folder") return "#7c5cfc";
  const ext = f.name.split(".").pop().toLowerCase();
  const map = {
    mp4:"#bd52e0",webm:"#bd52e0",mov:"#bd52e0",mkv:"#bd52e0",
    mp3:"#7c5cfc",wav:"#7c5cfc",flac:"#7c5cfc",aac:"#7c5cfc",m4a:"#7c5cfc",ogg:"#7c5cfc",
    jpg:"#52b0e0",jpeg:"#52b0e0",png:"#52b0e0",gif:"#52b0e0",webp:"#52b0e0",
    pdf:"#e05252",doc:"#4A90D9",docx:"#4A90D9",
    js:"#f0db4f",ts:"#3178c6",py:"#3572a5",json:"#cbcb41",
    zip:"#a0a0a0",rar:"#a0a0a0",
  };
  return map[ext] || "#555";
}

// ── SORT ──────────────────────────────────────────────────
function applySort() {
  const val = document.getElementById("sort-select").value;
  [sortKey, sortDir] = val.split("-");
  const sorted = [...filesData].sort((a, b) => {
    // folders always first
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    let av, bv;
    if (sortKey === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    if (sortKey === "size") { av = a.size || 0;          bv = b.size || 0; }
    if (sortKey === "date") { av = a.modified || 0;      bv = b.modified || 0; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ?  1 : -1;
    return 0;
  });
  renderFiles(sorted);
}

// ── NEW FOLDER ─────────────────────────────────────────────
function newFolder() {
  const name = prompt("Folder name:");
  if (!name || !name.trim()) return;
  fetch("/api/mkdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: currentPath, name: name.trim() })
  })
  .then(r => { if (!r.ok) throw new Error(); load(); })
  .catch(() => showToast("Could not create folder", "error"));
}

// ── INIT ──────────────────────────────────────────────────
load();
