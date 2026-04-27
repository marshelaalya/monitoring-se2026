/* ================================================================
   APP.JS — Core Utilities, Navbar, UI Helpers
   ================================================================ */

// ────────────────────────────────────────────────────────────────
// NAVBAR
// ────────────────────────────────────────────────────────────────
function initNavbar() {
  const user = getCurrentUser();
  if (!user) return;

  setEl('nav-user-name', t => t.textContent = user.nama);
  setEl('nav-user-role', t => t.textContent = user.jabatan);
  setEl('nav-avatar', t => t.textContent = user.avatar);

  // Show/hide dashboard link based on role
  const canDash = DASHBOARD_ROLES.includes(user.role) || BIDANG_DASHBOARD_ROLES.includes(user.role);
  const dashLink = document.getElementById('nav-dashboard-link');
  if (dashLink) dashLink.style.display = canDash ? '' : 'none';

  // Active nav link highlight
  const currentPage = window.location.pathname.replace(/.*\//, '') || 'index.html';
  document.querySelectorAll('.nav-link[href]').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Mobile toggle
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.getElementById('navbar-nav');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }
}

// ────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ────────────────────────────────────────────────────────────────
const TOAST_ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || '✓'}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ────────────────────────────────────────────────────────────────
// FORMATTERS
// ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const day = Math.floor(h / 24);
  if (day < 8) return `${day} hari lalu`;
  return formatDate(isoStr);
}

function pct(num, denom) {
  if (!denom) return 0;
  return Math.round((num / denom) * 100);
}

// ────────────────────────────────────────────────────────────────
// STATUS BADGE
// ────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    submitted: { cls: 'badge-success', text: '✓ Selesai' },
    editing:   { cls: 'badge-info',    text: '✏️ Sedang Disunting' },
    draft:     { cls: 'badge-info',    text: '✏️ Sedang Disunting' }, // backward compat
    none:      { cls: 'badge-danger',  text: '○ Belum Ada Laporan' },
  };
  const s = map[status] || map.none;
  return `<span class="badge ${s.cls}">${s.text}</span>`;
}

// ────────────────────────────────────────────────────────────────
// DOM HELPERS
// ────────────────────────────────────────────────────────────────
function setEl(id, fn) {
  const el = document.getElementById(id);
  if (el) fn(el);
}

function getEl(id) { return document.getElementById(id); }

function html(id, content) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = content;
}

// ────────────────────────────────────────────────────────────────
// FILE HANDLING
// ────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) { fileToBase64(file).then(resolve); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}

function isImage(base64) { return base64 && base64.startsWith('data:image/'); }

function renderFilePreview(base64, container) {
  if (!base64 || !container) return;
  if (isImage(base64)) {
    container.innerHTML = `<div class="file-preview-img"><img src="${base64}" alt="Dokumentasi"></div>`;
  } else {
    container.innerHTML = `<div class="file-preview-doc"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Dokumen terlampir</div>`;
  }
}

// ────────────────────────────────────────────────────────────────
// INIT ON EVERY PAGE
// ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  initNavbar();
});
