/* ================================================================
   DASHBOARD.JS v3 — Charts, Stats, Word Generator
   ================================================================ */

let dashUser   = null;
let dashPeriode = null;
let dashChart  = null;

document.addEventListener('DOMContentLoaded', async () => {
  showLoading("Memuat data dashboard...");
  await fetchInitData();
  hideLoading();
  
  dashUser   = requireDashboardAccess();
  if (!dashUser) return;
  dashPeriode = getCurrentPeriode();

  populatePeriodeFilter();
  loadDashboard(dashPeriode.id);
});

// ────────────────────────────────────────────────────────────────
// FILTER
// ────────────────────────────────────────────────────────────────
function populatePeriodeFilter() {
  const sel = getEl('filter-periode');
  if (!sel) return;
  const periodes = getPastPeriodes(12);
  sel.innerHTML = periodes.map(p =>
    `<option value="${p.id}" ${p.id === dashPeriode.id ? 'selected' : ''}>${p.label}</option>`
  ).join('');
}

function refreshDashboard() {
  const periodeId = getEl('filter-periode')?.value || dashPeriode.id;
  loadDashboard(periodeId);
}

// ────────────────────────────────────────────────────────────────
// MAIN LOAD
// ────────────────────────────────────────────────────────────────
function loadDashboard(periodeId) {
  const periodes = getPastPeriodes(12);
  const periode  = periodes.find(p => p.id === periodeId) || getCurrentPeriode();

  setEl('dash-periode-val', el => el.textContent = periode.label);

  const stats = getDashboardStats(periodeId, '');
  renderSummaryCards(stats);
  renderBidangProgress(stats, periodeId);
  renderPersonTable(periodeId);
  renderTimeline(periodeId);
  renderChart(stats);
  renderWordGenCard(periodeId, periode);
}

// ────────────────────────────────────────────────────────────────
// SUMMARY CARDS
// ────────────────────────────────────────────────────────────────
function renderSummaryCards(stats) {
  const pct = stats.total > 0 ? Math.round(stats.submitted / stats.total * 100) : 0;
  setEl('card-total',     el => el.textContent = stats.total);
  setEl('card-submitted', el => el.textContent = stats.submitted);
  setEl('card-draft',     el => el.textContent = stats.draft);
  setEl('card-none',      el => el.textContent = stats.none);
  setEl('card-pct',       el => el.textContent = `${pct}%`);
  setEl('card-sub-s',     el => el.textContent = stats.submitted);
  setEl('card-sub-d',     el => el.textContent = stats.draft);
  setEl('card-sub-n',     el => el.textContent = stats.none);
}

// ────────────────────────────────────────────────────────────────
// WORD GEN CARD
// ────────────────────────────────────────────────────────────────
function renderWordGenCard(periodeId, periode) {
  const status = getWordGenStatus();
  const allLap = getLaporanByPeriode(periodeId);
  const total  = getWorkersForDashboard().length;
  const submit = allLap.filter(l => l.status === 'submitted').length;
  const draft  = allLap.filter(l => l.status === 'draft').length;

  setEl('wg-periode-label', el => el.textContent = periode.label);

  setEl('wg-countdown', el => {
    const d = getDaysUntilDeadline();
    if (d <= 0) {
      el.innerHTML = '⚠️ Periode sudah berakhir';
      el.style.background = 'rgba(239,68,68,0.25)';
    } else if (d <= 2) {
      el.innerHTML = `⏰ H-${d} — Saatnya generate laporan!`;
      el.style.background = 'rgba(251,191,36,0.25)';
    } else {
      el.innerHTML = `📅 ${d} hari lagi batas akhir periode`;
    }
  });

  setEl('wg-progress-chips', el => {
    el.innerHTML = WORD_BIDANGS.map(bidang => {
      const lap    = allLap.find(l => l.bidang === bidang);
      const status = lap?.status || 'none';
      const icon   = status === 'submitted' ? '✓' : status === 'draft' ? '⏳' : '○';
      const short  = bidang.split(',')[0].replace('Teknis Pendataan dan ', 'Teknis ').replace('Pengolahan, Teknologi', 'Pengolahan').replace('Analisis dan ', 'Analisis ').split(' ').slice(0,2).join(' ');
      return `<span class="wg-chip">${icon} ${short}</span>`;
    }).join('');
  });

  const btn = getEl('btn-gen-word');
  const days = getDaysUntilDeadline();
  if (btn && days <= 2) btn.classList.add('urgent');
}

// ────────────────────────────────────────────────────────────────
// GENERATE WORD TRIGGER
// ────────────────────────────────────────────────────────────────
function doGenerateWord() {
  const periodeId = getEl('filter-periode')?.value || dashPeriode.id;
  const filename  = generateLaporanWord(periodeId);
  showToast(`📄 Laporan "${filename}" sedang didownload...`, 'success');
}

// ────────────────────────────────────────────────────────────────
// BIDANG PROGRESS
// ────────────────────────────────────────────────────────────────
function renderBidangProgress(stats, periodeId) {
  const container = getEl('bidang-progress-list');
  if (!container) return;
  const allLap = getLaporanByPeriode(periodeId);

  const bidangEntries = WORD_BIDANGS.map(bidang => {
    const lap = allLap.find(l => l.bidang === bidang);
    return { bidang, lap, total: 1,
      submitted: lap?.status === 'submitted' ? 1 : 0,
      draft:     lap?.status === 'draft' ? 1 : 0 };
  });

  container.innerHTML = bidangEntries.map(({ bidang, lap, submitted, draft }) => {
    const fillCls = submitted ? 'success' : draft ? 'warning' : 'danger';
    const fillPct = submitted ? 100 : draft ? 60 : 0;
    const shortBidang = bidang.length > 45 ? bidang.slice(0, 42) + '…' : bidang;
    return `
      <div class="progress-wrapper">
        <div class="progress-header">
          <span class="progress-label" title="${bidang}">${shortBidang}</span>
          ${statusBadge(lap?.status || 'none')}
        </div>
        <div class="progress-track">
          <div class="progress-fill ${fillCls}" style="width:${fillPct}%"></div>
        </div>
        <div class="progress-sub">
          ${lap
            ? `${(lap.dokumentasi || []).length} foto · Diperbarui ${formatDate(lap.updatedAt)}`
            : 'Belum ada laporan'}
        </div>
      </div>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────────
// PERSON TABLE (now shows kegiatan snippet)
// ────────────────────────────────────────────────────────────────
function renderPersonTable(periodeId) {
  const tbody = getEl('person-tbody');
  if (!tbody) return;
  const workers = getWorkersForDashboard();
  const allLap  = getLaporanByPeriode(periodeId);

  // Sort: belum lapor first
  const sorted = [...workers].sort((a, b) => {
    const ord = { none: 0, draft: 1, submitted: 2 };
    const getS = u => allLap.find(l => l.bidang === u.bidang)?.status || 'none';
    return (ord[getS(a)] || 0) - (ord[getS(b)] || 0);
  });

  tbody.innerHTML = sorted.map(u => {
    const lap        = allLap.find(l => l.bidang === u.bidang);
    const status     = lap?.status || 'none';
    const snippet    = lap?.kegiatan_dilakukan
      ? lap.kegiatan_dilakukan.replace(/\n/g,' ').slice(0,80) + (lap.kegiatan_dilakukan.length > 80 ? '…' : '')
      : '<em style="color:var(--text-muted)">—</em>';
    const fotoCount  = (lap?.dokumentasi || []).length;
    const lastUpdate = lap ? formatDate(lap.updatedAt) : '—';

    return `
      <tr style="cursor:pointer" onclick="showDetail('${u.bidang}','${periodeId}')" title="Klik untuk lihat detail laporan">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#FF8C5A);color:white;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${u.avatar}</div>
            <div>
              <div style="font-weight:700;font-size:14px">${u.nama}</div>
              <div style="font-size:12px;color:var(--text-muted)">${u.bidang.split(',')[0].replace('Teknis Pendataan dan ','').split(' ').slice(0,3).join(' ')}</div>
            </div>
          </div>
        </td>
        <td>${statusBadge(status)}</td>
        <td><span style="font-size:13px">${snippet}</span></td>
        <td style="text-align:center">
          ${fotoCount > 0 ? `<span class="badge badge-secondary">📷 ${fotoCount}</span>` : '<span style="color:var(--text-light);font-size:13px">—</span>'}
        </td>
        <td style="font-size:13px;color:var(--text-muted)">${lastUpdate}</td>
      </tr>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────────
// DETAIL MODAL
// ────────────────────────────────────────────────────────────────
function showDetail(bidang, periodeId) {
  const lap = getLaporanByBidangAndPeriode(bidang, periodeId);
  const modal = getEl('detail-modal-content');
  if (!modal) return;

  if (!lap) {
    modal.innerHTML = `
      <h3 style="margin:0 0 16px">${bidang}</h3>
      <div class="alert alert-warning"><span>⚠️</span><span>Belum ada laporan untuk bidang ini pada periode ini.</span></div>`;
  } else {
    const user = BPS_USERS.find(u => u.id === lap.userId);
    modal.innerHTML = `
      <h3 style="margin:0 0 4px;font-size:17px">${bidang}</h3>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
        Dilaporkan oleh: <strong>${user?.nama || '—'}</strong> &nbsp;·&nbsp; ${statusBadge(lap.status)}
        &nbsp;·&nbsp; ${formatDate(lap.updatedAt)}
      </div>
      <div class="divider"></div>
      <div style="margin-bottom:16px">
        <div style="font-weight:800;color:var(--primary);margin-bottom:8px;font-size:14px">📋 Kegiatan yang Telah Dilakukan:</div>
        <div style="font-size:14px;line-height:1.8;white-space:pre-line;background:#f9fafb;border-radius:8px;padding:12px">${lap.kegiatan_dilakukan || '—'}</div>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-weight:800;color:var(--primary);margin-bottom:8px;font-size:14px">🎯 Rencana Kedepan dan Pengawalan:</div>
        <div style="font-size:14px;line-height:1.8;white-space:pre-line;background:#f9fafb;border-radius:8px;padding:12px">${lap.rencana_kedepan || '—'}</div>
      </div>
      ${(lap.dokumentasi || []).length > 0 ? `
      <div>
        <div style="font-weight:800;color:var(--primary);margin-bottom:10px;font-size:14px">📷 Dokumentasi (${lap.dokumentasi.length} foto):</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
          ${lap.dokumentasi.map((doc, i) => `
            <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
              <img src="${doc.base64}" style="width:100%;height:120px;object-fit:cover;display:block">
              <div style="padding:8px;font-size:12px;color:var(--text-muted)">${doc.keterangan || 'Tanpa keterangan'}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}`;
  }

  getEl('detail-overlay').style.display = 'flex';
}

function closeDetailModal(e) {
  if (!e || e.target === getEl('detail-overlay')) {
    getEl('detail-overlay').style.display = 'none';
  }
}

// ────────────────────────────────────────────────────────────────
// TIMELINE
// ────────────────────────────────────────────────────────────────
function renderTimeline(periodeId) {
  const container = getEl('timeline-list');
  if (!container) return;
  const laporan = getLaporanByPeriode(periodeId)
    .filter(l => l.status !== 'none')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  if (!laporan.length) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:14px">Belum ada aktivitas.</div>`;
    return;
  }

  container.innerHTML = '<div class="timeline">' + laporan.map(l => {
    const user      = BPS_USERS.find(u => u.id === l.userId);
    if (!user) return '';
    const dotCls    = l.status === 'submitted' ? 'success' : 'warning';
    const snippet   = l.kegiatan_dilakukan
      ? l.kegiatan_dilakukan.replace(/\n/g,' ').slice(0, 90) + '…'
      : '';
    const fotoCount = (l.dokumentasi || []).length;
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${dotCls}"></div>
        <div class="timeline-content">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <div class="timeline-user">${user.nama}</div>
            ${statusBadge(l.status)}
            ${fotoCount ? `<span class="badge badge-secondary" style="font-size:10px">📷 ${fotoCount}</span>` : ''}
          </div>
          <div class="timeline-bidang">${l.bidang.split(',')[0].replace('Teknis Pendataan dan ','Teknis ')}</div>
          ${snippet ? `<div class="timeline-desc" style="margin-top:4px;font-size:12px;color:var(--text-muted)">"${snippet}"</div>` : ''}
          <div class="timeline-time">${formatDateTime(l.updatedAt)}</div>
        </div>
      </div>`;
  }).join('') + '</div>';
}

// ────────────────────────────────────────────────────────────────
// CHART
// ────────────────────────────────────────────────────────────────
function renderChart(stats) {
  const ctx = getEl('bidang-chart');
  if (!ctx) return;

  const labels = WORD_BIDANGS.map(b =>
    b.replace('Teknis Pendataan dan ','Teknis\n')
     .replace(', Hubungan Masyarakat dan Manajemen Risiko','\nHumas')
     .replace(', Teknologi Informasi dan Diseminasi','\n& TIK')
     .replace('Analisis dan ','Analisis\n')
  );

  const submittedData = WORD_BIDANGS.map(b => {
    const d = stats.byBidang[b];
    return d ? d.submitted : 0;
  });
  const draftData = WORD_BIDANGS.map(b => {
    const d = stats.byBidang[b];
    return d ? d.draft : 0;
  });
  const noneData = WORD_BIDANGS.map(b => {
    const d = stats.byBidang[b];
    return d ? (d.total - d.submitted - d.draft) : 1;
  });

  if (dashChart) { dashChart.destroy(); dashChart = null; }

  dashChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Selesai',     data: submittedData, backgroundColor: '#10B981', borderRadius: 4, stack: 'a' },
        { label: 'Draft',       data: draftData,     backgroundColor: '#F59E0B', borderRadius: 4, stack: 'a' },
        { label: 'Belum Lapor', data: noneData,      backgroundColor: '#EF4444', borderRadius: 4, stack: 'a' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 12 }, padding: 12 } },
        tooltip: { callbacks: { title: items => WORD_BIDANGS[items[0].dataIndex] } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } } },
        y: { stacked: true, beginAtZero: true, max: 1, grid: { color: '#F0F0F0' }, ticks: { stepSize: 1, font: { family: "'Plus Jakarta Sans',sans-serif" } } }
      }
    }
  });
}
