/* ================================================================
   GENERATE-WORD.JS — Auto-generate Laporan Word (.doc)
   Format: Kop Surat BPS Kepulauan Sula + Tabel + Dokumentasi Foto
   ================================================================ */

/**
 * Generate dan download file Word (.doc) laporan SE
 * @param {string} periodeId - ID periode, e.g. "2026-04-P2"
 */
function generateLaporanWord(periodeId) {
  const periodes = getPastPeriodes(14);
  const periode  = periodes.find(p => p.id === periodeId) || getCurrentPeriode();
  const allLap   = getLaporanByPeriode(periodeId);

  // Build main table rows
  const tableRows = WORD_BIDANGS.map((bidang, i) => {
    const lap      = allLap.find(l => l.bidang === bidang);
    const kegiatan = lap?.kegiatan_dilakukan ? escapeHtml(lap.kegiatan_dilakukan).replace(/\n/g, '<br>') : '<span style="color:#aaa;font-style:italic">Belum diisi</span>';
    const rencana  = lap?.rencana_kedepan    ? escapeHtml(lap.rencana_kedepan).replace(/\n/g,    '<br>') : '<span style="color:#aaa;font-style:italic">Belum diisi</span>';
    const statusDot = lap?.status === 'submitted'
      ? '&#9679;&nbsp;' : lap?.status === 'draft'
      ? '&#9651;&nbsp;' : '';

    return `
      <tr>
        <td style="width:28px;text-align:center;vertical-align:top;font-weight:bold">${i + 1}</td>
        <td style="width:160px;vertical-align:top;font-weight:bold;font-size:10pt">${bidang}</td>
        <td style="vertical-align:top;font-size:10pt">${kegiatan}</td>
        <td style="vertical-align:top;font-size:10pt">${rencana}</td>
      </tr>`;
  }).join('');

  // Build documentation pages
  const docPages = WORD_BIDANGS.map(bidang => {
    const lap  = allLap.find(l => l.bidang === bidang);
    const docs = lap?.dokumentasi?.filter(d => d.base64);
    if (!docs || docs.length === 0) return '';

    const fotosHtml = docs.map((doc, idx) => `
      <div style="text-align:center;margin-bottom:24px;page-break-inside:avoid">
        <img src="${doc.base64}"
             style="max-width:520px;max-height:380px;display:block;margin:0 auto;
                    border:1px solid #ccc;border-radius:4px">
        <p style="text-align:center;font-weight:bold;margin-top:8px;font-size:10pt">
          Dokumentasi ${idx + 1}: ${escapeHtml(doc.keterangan || '—')}
        </p>
      </div>`).join('');

    return `
      <div style="page-break-before:always">
        <h3 style="text-align:center;font-size:12pt;margin-bottom:16px;text-decoration:underline">
          Dokumentasi Kegiatan — ${bidang}
        </h3>
        ${fotosHtml}
      </div>`;
  }).join('');

  // ─── Tanggal pembuatan ───
  const today     = new Date();
  const buatTgl   = `${today.getDate()} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

  // ─── Full HTML Word document ───
  const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="BPS Monitoring SE">
  <!--[if gte mso 9]><xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml><![endif]-->
  <style>
    @page {
      margin: 2.5cm 2.5cm 2.5cm 2.5cm;
      size: A4 portrait;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000000;
      line-height: 1.4;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .kop-table td { border: none; vertical-align: top; }
    .main-table td, .main-table th {
      border: 1.5px solid #000;
      padding: 7px 9px;
      vertical-align: top;
    }
    .main-table th {
      background-color: #D9D9D9;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    .info-table td { border: none; padding: 2px 5px; font-size: 11pt; }
    .info-col1 { width: 170px; }
    h2 {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      margin: 14px 0 12px;
      text-transform: uppercase;
    }
    hr.kop-line {
      border: none;
      border-top: 2.5px solid #000;
      margin: 8px 0 14px;
    }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- KOP SURAT                                       -->
  <!-- ═══════════════════════════════════════════════ -->
  <table class="kop-table" style="width:100%">
    <tr>
      <td style="width:70%;padding:0">
        <p style="margin:0;font-size:14pt;font-weight:bold;letter-spacing:0.3px">BADAN PUSAT STATISTIK</p>
        <p style="margin:2px 0;font-size:14pt;font-weight:bold;letter-spacing:0.3px">KABUPATEN KEPULAUAN SULA</p>
        <p style="margin:4px 0 0;font-size:9pt">Jl. Yos Sudarso, Km 10 Jaya Rahmat, Sanana, Maluku Utara</p>
        <p style="margin:2px 0;font-size:9pt">Email: bps8203@bps.go.id &nbsp;|&nbsp; Web: kepu.ukab.bps.go.id</p>
      </td>
      <td style="text-align:right;vertical-align:middle;padding:0">
        <p style="margin:0;font-size:16pt;font-weight:bold;color:#E05A1C;letter-spacing:1px">SENSUS</p>
        <p style="margin:0;font-size:16pt;font-weight:bold;color:#E05A1C;letter-spacing:1px">EKONOMI</p>
        <p style="margin:0;font-size:16pt;font-weight:bold;color:#E05A1C;letter-spacing:1px">2026</p>
      </td>
    </tr>
  </table>

  <hr class="kop-line">

  <!-- ═══════════════════════════════════════════════ -->
  <!-- JUDUL                                           -->
  <!-- ═══════════════════════════════════════════════ -->
  <h2>Laporan Kegiatan Sensus Ekonomi 2026</h2>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- INFO LAPORAN                                    -->
  <!-- ═══════════════════════════════════════════════ -->
  <table class="info-table" style="width:70%;margin-bottom:16px">
    <tr>
      <td class="info-col1"><b>Bulan</b></td>
      <td>: ${periode.monthYear || (MONTH_NAMES[periode.month] + ' ' + periode.year)}</td>
    </tr>
    <tr>
      <td><b>Periode Tanggal</b></td>
      <td>: ${periode.label}</td>
    </tr>
    <tr>
      <td><b>Provinsi</b></td>
      <td>: Maluku Utara</td>
    </tr>
    <tr>
      <td><b>Kabupaten</b></td>
      <td>: Kepulauan Sula</td>
    </tr>
  </table>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- TABEL UTAMA                                     -->
  <!-- ═══════════════════════════════════════════════ -->
  <table class="main-table">
    <thead>
      <tr>
        <th style="width:28px">No</th>
        <th style="width:160px">Bidang</th>
        <th>Kegiatan yang Telah Dilakukan</th>
        <th>Rencana Kedepan dan Pengawalan</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- Tanda tangan / penutup -->
  <table style="width:100%;margin-top:30px;border:none">
    <tr>
      <td style="border:none;width:60%">&nbsp;</td>
      <td style="border:none;text-align:center;width:40%">
        <p style="margin:0">Sanana, ${buatTgl}</p>
        <p style="margin:2px 0">Ketua Pelaksana SE 2026</p>
        <br><br><br>
        <p style="margin:0;font-weight:bold;text-decoration:underline">Budi Santoso, S.Si., M.Sc.</p>
        <p style="margin:0;font-size:10pt">NIP. ...</p>
      </td>
    </tr>
  </table>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- HALAMAN DOKUMENTASI (per bidang yang punya foto)-->
  <!-- ═══════════════════════════════════════════════ -->
  ${docPages}

</body>
</html>`;

  // ─── Download ───
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const filename = `Laporan_SE_${MONTH_NAMES[periode.month]}_${periode.year}_P${periode.periodeNum}.doc`;
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/**
 * Get Word generation status for current periode
 * Returns: { canGenerate: bool, message: string, daysLeft: int }
 */
function getWordGenStatus() {
  const days = getDaysUntilDeadline();
  const p    = getCurrentPeriode();
  const curr = getLaporanByPeriode(p.id);
  const submitted = curr.filter(l => l.status === 'submitted').length;
  const total     = getWorkersForDashboard().length;

  if (days <= 0) {
    return { canGenerate: true, urgent: true, days, message: `⚠️ Batas waktu sudah lewat! Segera generate laporan.`, submitted, total };
  }
  if (days <= 2) {
    return { canGenerate: true, urgent: true, days, message: `⏰ H-${days}: Sudah waktunya generate laporan!`, submitted, total };
  }
  return { canGenerate: true, urgent: false, days, message: `📅 ${days} hari lagi batas akhir periode`, submitted, total };
}
