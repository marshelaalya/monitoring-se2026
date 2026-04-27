/* ================================================================
   LAPORAN.JS v3 — Form Input Laporan (Ketua Bidang Only)
   Fields: kegiatan_dilakukan, rencana_kedepan, dokumentasi[]
   ================================================================ */

let curUser    = null;
let curPeriode = null;
let curLaporan = null;
let fotoList   = []; // [ { id, base64, keterangan } ]
let isEditMode = true;
let editSnapshot = null; // snapshot sebelum masuk edit mode

// ────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showLoading("Memuat data laporan...");
  await fetchInitData();
  hideLoading();
  
  curUser = requireAuth();
  if (!curUser) return;

  curPeriode = getCurrentPeriode();
  curLaporan = getLaporanByUserAndPeriode(curUser.id, curPeriode.id);

  // Show dashboard link for those who have access
  if (DASHBOARD_ROLES.includes(curUser.role) || BIDANG_DASHBOARD_ROLES.includes(curUser.role)) {
    const navDash = document.getElementById('nav-dashboard-link');
    if (navDash) navDash.style.display = '';
  }

  if (!canFillLaporan(curUser)) {
    // Show restricted state
    document.getElementById('state-restricted').style.display = '';
    const btnDash = document.getElementById('btn-ke-dashboard');
    if (btnDash && !DASHBOARD_ROLES.includes(curUser.role) && !BIDANG_DASHBOARD_ROLES.includes(curUser.role)) {
      btnDash.style.display = 'none';
    }
    return;
  }

  // Show form
  document.getElementById('state-form').style.display = '';
  renderPeriodeBar();
  renderUserInfo();
  populateForm();
  setupButtons();
  setupFotoUpload();
  setupCharCounters();
  renderRiwayatSingkat();
});

// ────────────────────────────────────────────────────────────────
// PERIODE BAR
// ────────────────────────────────────────────────────────────────
function renderPeriodeBar() {
  setEl('periode-value', el => el.textContent = curPeriode.label);
  setEl('periode-date', el => el.textContent = `Batas akhir: ${formatDate(new Date(curPeriode.year, curPeriode.month, curPeriode.endDay))}`);
  const status = curLaporan ? curLaporan.status : 'none';
  const statusMap = {
    submitted: { text: '✓ Sudah Disubmit',      cls: 'badge-success' },
    editing:   { text: '✏️ Sedang Disunting',   cls: 'badge-info' },
    draft:     { text: '✏️ Sedang Disunting',   cls: 'badge-info' },
    none:      { text: '○ Belum Ada Laporan',  cls: 'badge-danger' },
  };
  const s = statusMap[status] || statusMap.none;
  setEl('periode-status', el => { el.className = `badge ${s.cls}`; el.textContent = s.text; });
}

// ────────────────────────────────────────────────────────────────
// USER INFO
// ────────────────────────────────────────────────────────────────
function renderUserInfo() {
  setEl('field-nama',    el => el.textContent = curUser.nama);
  setEl('field-jabatan', el => el.textContent = curUser.jabatan);
  setEl('field-bidang',  el => el.textContent = curUser.bidang);
}

// ────────────────────────────────────────────────────────────────
// POPULATE FORM
// ────────────────────────────────────────────────────────────────
function populateForm() {
  if (!curLaporan) {
    fotoList = [];
    renderFotoGrid();
    renderModeBanner();
    setMode('edit');
    return;
  }

  setEl('field-kegiatan-dilakukan', el => { el.value = curLaporan.kegiatan_dilakukan || ''; autoResize(el); });
  setEl('field-rencana-kedepan',    el => { el.value = curLaporan.rencana_kedepan    || ''; autoResize(el); });
  fotoList = (curLaporan.dokumentasi || []).map(d => ({ ...d }));
  renderFotoGrid();
  updateCharCounters();
  renderModeBanner();

  // Submitted → view mode. Editing/draft → edit mode.
  if (curLaporan.status === 'submitted') {
    setMode('view');
  } else {
    setMode('edit');
  }
}

// ────────────────────────────────────────────────────────────────
// FOTO GRID
// ────────────────────────────────────────────────────────────────
function renderFotoGrid() {
  const grid = getEl('foto-grid');
  if (!grid) return;
  if (!fotoList.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = fotoList.map((foto, i) => `
    <div class="foto-card" id="foto-card-${foto.id}">
      <img class="foto-card-img" src="${foto.base64}" alt="Dokumentasi ${i + 1}">
      <button class="foto-remove-btn" onclick="removeFoto('${foto.id}')" title="Hapus foto"
        style="display:${isEditMode ? '' : 'none'}">✕</button>
      <div class="foto-card-body">
        <label style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px;display:block">
          Keterangan Foto ${i + 1} <span style="color:var(--danger)">*</span>
        </label>
        <textarea class="foto-card-keterangan" id="ket-${foto.id}"
          placeholder="Contoh: Pelatihan CAPI bersama 15 petugas di Aula BPS, 17 April 2026"
          ${isEditMode ? '' : 'readonly style="background:var(--surface);cursor:default"'}
          onchange="updateFotoKeterangan('${foto.id}', this.value)">${escXss(foto.keterangan || '')}</textarea>
      </div>
    </div>
  `).join('');
}

function removeFoto(fotoId) {
  fotoList = fotoList.filter(f => f.id !== fotoId);
  renderFotoGrid();
  showToast('Foto dihapus.', 'info');
}

function updateFotoKeterangan(fotoId, keterangan) {
  const f = fotoList.find(f => f.id === fotoId);
  if (f) f.keterangan = keterangan;
}

function escXss(str) { return str.replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ────────────────────────────────────────────────────────────────
// FOTO UPLOAD
// ────────────────────────────────────────────────────────────────
function setupFotoUpload() {
  const input = getEl('foto-upload-input');
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 3 * 1024 * 1024) { showToast(`${file.name}: ukuran terlalu besar (maks. 3MB)`, 'warning'); continue; }
      try {
        showLoading("Uploading gambar ke Cloud...");
        const base64 = file.type.startsWith('image/')
          ? await compressImage(file, 900, 0.75)
          : await fileToBase64(file);
          
        const fileName = curPeriode.id + '-' + generateId() + '.jpg';
        const uploadedUrl = await postUploadPhoto(base64, fileName);
        
        fotoList.push({ id: generateId(), base64: uploadedUrl, keterangan: '' });
        renderFotoGrid();
        showToast('Foto berhasil ditambahkan!', 'success');
      } catch (err) { 
        showToast('Gagal memproses foto. Coba lagi.', 'error'); 
        console.error(err);
      } finally {
        hideLoading();
      }
    }
    input.value = '';
  });
}

// ────────────────────────────────────────────────────────────────
// AUTO-RESIZE TEXTAREA
// ────────────────────────────────────────────────────────────────
function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.max(120, el.scrollHeight) + 'px';
}

// ────────────────────────────────────────────────────────────────
// CHAR COUNTERS
// ────────────────────────────────────────────────────────────────
function setupCharCounters() {
  const taK = getEl('field-kegiatan-dilakukan');
  const taR = getEl('field-rencana-kedepan');
  if (taK) {
    taK.addEventListener('input', () => {
      setEl('char-kegiatan', el => el.textContent = taK.value.length);
      autoResize(taK);
    });
  }
  if (taR) {
    taR.addEventListener('input', () => {
      setEl('char-rencana', el => el.textContent = taR.value.length);
      autoResize(taR);
    });
  }
}
function updateCharCounters() {
  const taK = getEl('field-kegiatan-dilakukan');
  const taR = getEl('field-rencana-kedepan');
  if (taK) setEl('char-kegiatan', el => el.textContent = taK.value.length);
  if (taR) setEl('char-rencana',  el => el.textContent = taR.value.length);
}

// ────────────────────────────────────────────────────────────────
// MODE MANAGEMENT
// ────────────────────────────────────────────────────────────────
function setMode(mode) {
  isEditMode = (mode === 'edit');
  const body = getEl('form-body');
  if (body) body.setAttribute('data-mode', mode);

  // Update view content boxes
  if (!isEditMode) renderViewContent();

  // Foto empty state
  const fotoEmptyView = getEl('foto-empty-view');
  if (fotoEmptyView) fotoEmptyView.style.display = (!isEditMode && !fotoList.length) ? '' : 'none';

  // Re-render foto grid (to update remove buttons)
  renderFotoGrid();

  // Re-render action buttons
  renderActionButtons();
  renderModeBanner();

  // Auto-scroll to top of form
  const formEl = getEl('state-form');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function enterEditMode() {
  // Save snapshot for cancel
  editSnapshot = {
    kegiatan: getEl('field-kegiatan-dilakukan')?.value || '',
    rencana:  getEl('field-rencana-kedepan')?.value    || '',
    fotoList: JSON.parse(JSON.stringify(fotoList)),
  };
  setMode('edit');
}

function cancelEdit() {
  if (editSnapshot) {
    setEl('field-kegiatan-dilakukan', el => { el.value = editSnapshot.kegiatan; autoResize(el); });
    setEl('field-rencana-kedepan',    el => { el.value = editSnapshot.rencana;  autoResize(el); });
    fotoList = editSnapshot.fotoList;
    editSnapshot = null;
  }
  setMode('view');
}

function renderViewContent() {
  const k = getEl('field-kegiatan-dilakukan')?.value || '';
  const r = getEl('field-rencana-kedepan')?.value    || '';

  const viewK = getEl('view-kegiatan');
  if (viewK) {
    if (k.trim()) {
      viewK.className = 'content-view-box view-only';
      viewK.textContent = k;
    } else {
      viewK.className = 'content-view-box empty view-only';
      viewK.innerHTML = '<span>📝</span><span>Belum diisi</span>';
    }
  }

  const viewR = getEl('view-rencana');
  if (viewR) {
    if (r.trim()) {
      viewR.className = 'content-view-box view-only';
      viewR.textContent = r;
    } else {
      viewR.className = 'content-view-box empty view-only';
      viewR.innerHTML = '<span>🎯</span><span>Belum diisi</span>';
    }
  }
}

function renderActionButtons() {
  const act = getEl('form-actions');
  if (!act) return;

  const btnStyle = 'font-size:15px;padding:14px 22px;min-width:160px';

  if (!isEditMode) {
    // VIEW MODE: Sunting + Submit
    act.innerHTML = `
      <button onclick="enterEditMode()" class="btn btn-outline" style="${btnStyle}">
        ✏️ Sunting Laporan
      </button>
      <button onclick="saveLaporanForm('submitted')" class="btn btn-success" style="${btnStyle}">
        ✅ Submit Laporan
      </button>
      <div style="margin-left:auto;font-size:12px;color:var(--text-muted);line-height:1.8">
        <strong>Sunting</strong> = ubah isi laporan<br>
        <strong>Submit</strong> = kirim ulang ke pimpinan
      </div>`;
  } else {
    // EDIT MODE: Batal (jika ada snapshot) + Submit
    const batalBtn = editSnapshot !== null
      ? `<button onclick="cancelEdit()" class="btn-batal">❌ Batal Sunting</button>`
      : '';
    act.innerHTML = `
      ${batalBtn}
      <button onclick="saveLaporanForm('submitted')" class="btn btn-success" style="${btnStyle}">
        ✅ Submit Laporan
      </button>
      <div style="margin-left:auto;font-size:12px;color:var(--text-muted);line-height:1.8">
        <strong>Submit</strong> = simpan dan kirim ke pimpinan<br>
        ${editSnapshot ? '<strong>Batal</strong> = kembali tanpa menyimpan' : ''}
      </div>`;
  }
}

// ────────────────────────────────────────────────────────────────
// MODE BANNER (editing vs submitted)
// ────────────────────────────────────────────────────────────────
function renderModeBanner() {
  const banner = getEl('mode-banner');
  if (!banner) return;
  const status = curLaporan ? curLaporan.status : 'none';
  if (status === 'submitted') {
    const waktu = curLaporan.updatedAt ? ` — ${formatDateTime(curLaporan.updatedAt)}` : '';
    banner.innerHTML = `
      <div class="mode-banner submitted">
        <span class="mode-banner-icon">✅</span>
        <div><strong>Laporan Sudah Disubmit</strong>${waktu}<br>
        <span style="font-weight:400;font-size:12px">Anda tetap bisa menyunting dan submit ulang jika ada perubahan.</span></div>
      </div>`;
  } else if (status === 'editing' || status === 'draft') {
    const waktu = curLaporan.updatedAt ? ` — disimpan ${formatDateTime(curLaporan.updatedAt)}` : '';
    banner.innerHTML = `
      <div class="mode-banner editing">
        <span class="mode-banner-icon">✏️</span>
        <div><strong>Mode Penyuntingan</strong>${waktu}<br>
        <span style="font-weight:400;font-size:12px">Laporan belum disubmit ke pimpinan. Klik Submit bila sudah selesai.</span></div>
      </div>`;
  } else {
    banner.innerHTML = '';
  }
}

// ────────────────────────────────────────────────────────────────
// FORM LOCK (removed — form selalu bisa diedit)
// ────────────────────────────────────────────────────────────────
function lockForm() { /* tidak mengunci — form bisa disunting kapanpun */ }

// ────────────────────────────────────────────────────────────────
// SAVE / SUBMIT
// ────────────────────────────────────────────────────────────────
function setupButtons() {
  // Buttons now rendered dynamically by renderActionButtons()
  renderActionButtons();
}

async function saveLaporanForm(status) {
  const kegiatan = (getEl('field-kegiatan-dilakukan')?.value || '').trim();
  const rencana  = (getEl('field-rencana-kedepan')?.value    || '').trim();

  if (!kegiatan) { showToast('Kolom "Kegiatan yang Telah Dilakukan" wajib diisi.', 'warning'); getEl('field-kegiatan-dilakukan')?.focus(); return; }
  if (!rencana)  { showToast('Kolom "Rencana Kedepan dan Pengawalan" wajib diisi.', 'warning'); getEl('field-rencana-kedepan')?.focus(); return; }

  fotoList.forEach(f => {
    const ketEl = getEl(`ket-${f.id}`);
    if (ketEl) f.keterangan = ketEl.value;
  });

  if (status === 'submitted') {
    const missingKet = fotoList.filter(f => !f.keterangan.trim());
    if (missingKet.length) {
      showToast(`⚠️ ${missingKet.length} foto belum ada keterangan. Harap isi keterangan setiap foto.`, 'warning');
      return;
    }
  }

  const laporanObj = {
    id:                 curLaporan ? curLaporan.id : generateId(),
    userId:             curUser.id,
    periodeId:          curPeriode.id,
    bidang:             curUser.bidang,
    status,
    kegiatan_dilakukan: kegiatan,
    rencana_kedepan:    rencana,
    dokumentasi:        fotoList.map(f => ({ id: f.id, base64: f.base64, keterangan: f.keterangan })),
    createdAt:          curLaporan ? curLaporan.createdAt : new Date().toISOString(),
    updatedAt:          new Date().toISOString()
  };

  try {
    showLoading("Menyimpan ke server...");
    await postSaveLaporan(laporanObj);
    saveLaporan(laporanObj); // Update in-memory
    curLaporan = laporanObj;

    const msg = status === 'submitted'
      ? '✅ Laporan berhasil disubmit ke server!'
      : '✏️ Laporan disinkronisasi ke server.';
    showToast(msg, status === 'submitted' ? 'success' : 'info');
    
    renderPeriodeBar();
    renderModeBanner();
    renderRiwayatSingkat();

    if (status === 'submitted') {
      editSnapshot = null;
      setMode('view');
    }
  } catch (err) {
    showToast("Gagal menyimpan ke server: " + err.message, "error");
    console.error(err);
  } finally {
    hideLoading();
  }
}

// ────────────────────────────────────────────────────────────────
// RIWAYAT SINGKAT
// ────────────────────────────────────────────────────────────────
function renderRiwayatSingkat() {
  const container = getEl('riwayat-singkat');
  if (!container) return;
  const all = getLaporanByUser(curUser.id)
    .filter(l => l.periodeId !== curPeriode.id)
    .sort((a, b) => b.periodeId.localeCompare(a.periodeId))
    .slice(0, 6);
  const pMap = {};
  getPastPeriodes(14).forEach(p => pMap[p.id] = p);

  if (!all.length) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
      <div style="font-size:32px;margin-bottom:8px">📭</div>
      <div>Belum ada laporan<br>periode sebelumnya</div>
    </div>`;
    return;
  }

  container.innerHTML = all.map(l => {
    const p = pMap[l.periodeId] || { label: l.periodeId };
    const fotoCount = (l.dokumentasi || []).length;
    return `
      <div class="riwayat-aside-item" onclick="window.location='riwayat.html'" title="Lihat detail di halaman Riwayat">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div class="riwayat-aside-periode">${p.label}</div>
          ${statusBadge(l.status)}
        </div>
        ${fotoCount ? `<div style="font-size:11px;color:var(--text-muted);margin-top:5px">📷 ${fotoCount} foto dokumentasi</div>` : ''}
      </div>`;
  }).join('');
}
