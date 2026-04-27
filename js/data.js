/* ================================================================
   DATA LAYER v3 — Monitoring Sensus Ekonomi BPS
   Perubahan: Hanya ketua_bidang isi laporan, field baru, nama bidang sesuai Word template
   ================================================================ */

// ────────────────────────────────────────────────────────────────
// USERS (Akan dimuat dari Google Sheets)
// ────────────────────────────────────────────────────────────────
let BPS_USERS = [];

// Fungsi untuk meng-assign data dari Google Sheets ke variabel lokal
function setUsersData(data) { BPS_USERS = data; }


// ────────────────────────────────────────────────────────────────
// ROLES
// ────────────────────────────────────────────────────────────────
// Full dashboard access
const DASHBOARD_ROLES       = ["penanggung_jawab", "ketua_pelaksana", "wakil_ketua", "sekretaris"];
// Limited dashboard (hanya bidang sendiri)
const BIDANG_DASHBOARD_ROLES = ["ketua_bidang"];
// Yang mengisi laporan — HANYA ketua_bidang
const WORKER_ROLES          = ["ketua_bidang"];

// 4 Bidang sesuai template Word BPS Kepulauan Sula SE 2026
const WORD_BIDANGS = [
  "Teknis Pendataan dan Manajemen Lapangan",
  "Administrasi, Hubungan Masyarakat dan Manajemen Risiko",
  "Pengolahan, Teknologi Informasi dan Diseminasi",
  "Analisis dan Kualitas Data",
];

// ────────────────────────────────────────────────────────────────
// PERIODE FUNCTIONS
// ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function getCurrentPeriode() {
  const now = new Date();
  return buildPeriode(now.getFullYear(), now.getMonth(), now.getDate() <= 15 ? 1 : 2);
}

function buildPeriode(year, month, periodeNum) {
  const lastDay    = new Date(year, month + 1, 0).getDate();
  const startDay   = periodeNum === 1 ? 1 : 16;
  const endDay     = periodeNum === 1 ? 15 : lastDay;
  const id         = `${year}-${String(month + 1).padStart(2, '0')}-P${periodeNum}`;
  const deadlineDate = new Date(year, month, endDay);
  const h2Date       = new Date(year, month, endDay - 1); // H-1 before last day
  return {
    id,
    label: `${startDay}–${endDay} ${MONTH_NAMES[month]} ${year}`,
    short: `${MONTH_NAMES[month]} ${year} (Periode ${periodeNum})`,
    year, month, periodeNum, startDay, endDay,
    deadlineDate, h2Date,
    monthYear: `${MONTH_NAMES[month]} ${year}`,
  };
}

function getPastPeriodes(count = 12) {
  const result = [];
  const now    = new Date();
  let year     = now.getFullYear();
  let month    = now.getMonth();
  let pNum     = now.getDate() <= 15 ? 1 : 2;

  for (let i = 0; i < count; i++) {
    result.push(buildPeriode(year, month, pNum));
    if (pNum === 1) {
      pNum = 2; month--;
      if (month < 0) { month = 11; year--; }
    } else {
      pNum = 1;
    }
  }
  return result;
}

// Days until deadline of current periode
function getDaysUntilDeadline() {
  const p   = getCurrentPeriode();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(p.year, p.month, p.endDay);
  return Math.ceil((deadline - now) / 86400000);
}

// ────────────────────────────────────────────────────────────────
// DATA LAYER (from GAS)
// ────────────────────────────────────────────────────────────────
const SESSION_KEY = 'bps_se_session_v4';

function getAllLaporan() {
  return window.APP_LAPORAN || [];
}
function setAllLaporan(data) {
  window.APP_LAPORAN = data; // In-memory update, server sync via api.js
}

function getLaporanByUser(userId) {
  return getAllLaporan().filter(l => l.userId == userId);
}
function getLaporanByUserAndPeriode(userId, periodeId) {
  return getAllLaporan().find(l => l.userId == userId && l.periodeId === periodeId) || null;
}
function getLaporanByPeriode(periodeId) {
  return getAllLaporan().filter(l => l.periodeId === periodeId);
}
function getLaporanByBidangAndPeriode(bidang, periodeId) {
  return getAllLaporan().find(l => l.bidang === bidang && l.periodeId === periodeId) || null;
}

function saveLaporan(laporan) {
  const all = getAllLaporan();
  const idx = all.findIndex(l => l.id == laporan.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...laporan, updatedAt: now };
  } else {
    all.push({ ...laporan, createdAt: now, updatedAt: now });
  }
  setAllLaporan(all);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ────────────────────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────────────────────
function login(username, password) {
  const user = BPS_USERS.find(u => u.username === username.trim() && u.password === password);
  if (!user) return null;
  const session = { ...user };
  delete session.password;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return null; }
  return user;
}

function requireDashboardAccess() {
  const user = requireAuth();
  if (!user) return null;
  const ok = DASHBOARD_ROLES.includes(user.role) || BIDANG_DASHBOARD_ROLES.includes(user.role);
  if (!ok) { window.location.href = 'laporan.html'; return null; }
  return user;
}

function canFullDashboard(user) { return DASHBOARD_ROLES.includes(user.role); }
function canFillLaporan(user)   { return user && user.role === 'ketua_bidang'; }

// ────────────────────────────────────────────────────────────────
// STATS HELPERS (for dashboard)
// ────────────────────────────────────────────────────────────────
function getWorkersForDashboard() {
  return BPS_USERS.filter(u => WORKER_ROLES.includes(u.role));
}

function getUserStatus(userId, periodeId) {
  const lap = getLaporanByUserAndPeriode(userId, periodeId);
  if (!lap) return 'none';
  return lap.status;
}

function getDashboardStats(periodeId, bidangFilter) {
  let workers = getWorkersForDashboard();
  if (bidangFilter) workers = workers.filter(u => u.bidang === bidangFilter);
  let submitted = 0, draft = 0, none = 0;
  const byBidang = {};

  workers.forEach(u => {
    const lap    = getLaporanByUserAndPeriode(u.id, periodeId);
    const status = lap ? lap.status : 'none';
    if (status === 'submitted') submitted++;
    else if (status === 'draft') draft++;
    else none++;

    if (!byBidang[u.bidang]) byBidang[u.bidang] = { total: 0, submitted: 0, draft: 0 };
    byBidang[u.bidang].total++;
    if (status === 'submitted') byBidang[u.bidang].submitted++;
    else if (status === 'draft') byBidang[u.bidang].draft++;
  });

  const completion = submitted > 0 ? Math.round((submitted / workers.length) * 100) : 0;
  return { total: workers.length, submitted, draft, none, completion, byBidang };
}


