/* ================================================================
   API.JS — Komunikasi dengan Google Apps Script Backend
   ================================================================ */

// GANTI DENGAN WEB APP URL DARI GOOGLE APPS SCRIPT ANDA
const GAS_URL = "https://script.google.com/macros/s/AKfycbwwmo4Df_ZrRA6W5cagDASRsUtAJdFgISPJ-F_-ozogWTv3QMhCEEl2INanRT6RxYrT/exec";

// Loading Overlay UI
function showLoading(message = "Memuat data...") {
  let overlay = document.getElementById('api-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'api-loading-overlay';
    overlay.innerHTML = `
      <div class="api-spinner"></div>
      <div class="api-msg" id="api-loading-msg">${message}</div>
    `;
    document.body.appendChild(overlay);

    // Add CSS dynamically 
    const style = document.createElement('style');
    style.innerHTML = `
      #api-loading-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(15, 24, 42, 0.7); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Inter', sans-serif;
      }
      .api-spinner {
        width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3);
        border-top-color: white; border-radius: 50%;
        animation: api-spin 1s linear infinite; margin-bottom: 16px;
      }
      .api-msg { font-size: 15px; font-weight: 600; text-align: center; }
      @keyframes api-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }
  document.getElementById('api-loading-msg').textContent = message;
  overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('api-loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

// Fetch Init Data (Users & Laporan)
async function fetchInitData() {
  if (GAS_URL.includes("GANTI_DENGAN")) {
    console.warn("GAS URL belum disetup! Menggunakan fallback demo lokal.");
    window.APP_USERS = [
      { id: 1, username: "kepala", password: "bps2026", nama: "Dr. Ahmad Yani, S.T., M.Si.", role: "penanggung_jawab", jabatan: "Penanggung Jawab (Kepala BPS)", bidang: "Pimpinan", avatar: "AY" },
      { id: 2, username: "ketua_se", password: "bps2026", nama: "Budi Santoso, S.Si., M.Sc.", role: "ketua_pelaksana", jabatan: "Ketua Pelaksana SE", bidang: "Pimpinan", avatar: "BS" },
      { id: 3, username: "wakil", password: "bps2026", nama: "Siti Rahayu, S.E., M.M.", role: "wakil_ketua", jabatan: "Wakil Ketua", bidang: "Pimpinan", avatar: "SR" },
      { id: 4, username: "sekretaris", password: "bps2026", nama: "Dewi Lestari, S.Sos.", role: "sekretaris", jabatan: "Sekretaris", bidang: "Sekretariat", avatar: "DL" },
      { id: 5, username: "kteknis", password: "bps2026", nama: "Rudi Hermawan, S.T.", role: "ketua_bidang", jabatan: "Ketua Bidang Teknis & Manajemen Lapangan", bidang: "Teknis Pendataan dan Manajemen Lapangan", avatar: "RH" },
      { id: 8, username: "kpengolahan", password: "bps2026", nama: "Maya Kusuma, S.Kom.", role: "ketua_bidang", jabatan: "Ketua Bidang Pengolahan & TIK", bidang: "Pengolahan, Teknologi Informasi dan Diseminasi", avatar: "MK" },
      { id: 11, username: "kadmin", password: "bps2026", nama: "Hendra Gunawan, S.E.", role: "ketua_bidang", jabatan: "Ketua Bidang Administrasi & Humas", bidang: "Administrasi, Hubungan Masyarakat dan Manajemen Risiko", avatar: "HG" },
      { id: 14, username: "kanalisis", password: "bps2026", nama: "Dr. Sri Wahyuni, M.Si.", role: "ketua_bidang", jabatan: "Ketua Analisis Kualitas Data", bidang: "Analisis dan Kualitas Data", avatar: "SW" },
      { id: 6, username: "angteknis1", password: "bps2026", nama: "Andi Prasetyo, S.Si.", role: "anggota", jabatan: "Anggota Bidang Teknis", bidang: "Teknis Pendataan dan Manajemen Lapangan", avatar: "AP" },
      { id: 7, username: "angteknis2", password: "bps2026", nama: "Lili Kurniawan, A.Md.", role: "anggota", jabatan: "Anggota Bidang Teknis", bidang: "Teknis Pendataan dan Manajemen Lapangan", avatar: "LK" },
      { id: 9, username: "angpengolahan1", password: "bps2026", nama: "Deni Setiawan, S.Kom.", role: "anggota", jabatan: "Anggota Bidang Pengolahan", bidang: "Pengolahan, Teknologi Informasi dan Diseminasi", avatar: "DS" },
      { id: 10, username: "angpengolahan2", password: "bps2026", nama: "Rina Wulandari, S.T.", role: "anggota", jabatan: "Anggota Bidang Pengolahan", bidang: "Pengolahan, Teknologi Informasi dan Diseminasi", avatar: "RW" },
      { id: 12, username: "angadmin1", password: "bps2026", nama: "Fitri Handayani, S.Sos.", role: "anggota", jabatan: "Anggota Bidang Administrasi", bidang: "Administrasi, Hubungan Masyarakat dan Manajemen Risiko", avatar: "FH" },
      { id: 13, username: "angadmin2", password: "bps2026", nama: "Bambang Suharto, A.Md.", role: "anggota", jabatan: "Anggota Bidang Administrasi", bidang: "Administrasi, Hubungan Masyarakat dan Manajemen Risiko", avatar: "BA" },
      { id: 15, username: "anganalisis1", password: "bps2026", nama: "Yusuf Rahman, S.Si.", role: "anggota", jabatan: "Anggota Analisis Kualitas Data", bidang: "Analisis dan Kualitas Data", avatar: "YR" },
      { id: 16, username: "anganalisis2", password: "bps2026", nama: "Putri Anggraini, S.Stat.", role: "anggota", jabatan: "Anggota Analisis Kualitas Data", bidang: "Analisis dan Kualitas Data", avatar: "PA" },
    ];
    setUsersData(window.APP_USERS);
    // For local fallback, we leave APP_LAPORAN empty or load from localStorage temporarily
    try { window.APP_LAPORAN = JSON.parse(localStorage.getItem('bps_se_laporan_v3') || '[]'); } catch { window.APP_LAPORAN = []; }
    return;
  }

  try {
    const res = await fetch(GAS_URL);
    const result = await res.json();
    if (result.status === 'success') {
      window.APP_USERS = result.data.users;
      window.APP_LAPORAN = result.data.laporan;

      // Auto-cast types appropriately
      // Sesuaikan role jika diperlukan
      setUsersData(window.APP_USERS);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Gagal memuat data dari gsheet:", error);
    showToast("Gagal terhubung ke database. Periksa koneksi atau URL Script.", "error");
    window.APP_USERS = [];
    window.APP_LAPORAN = [];
  }
}

// Post JSON to GAS (Save Laporan)
async function postSaveLaporan(laporanObj) {
  if (GAS_URL.includes("GANTI_DENGAN")) {
    showToast("Demo Mode Lokal (Simulasi Sukses)", "success");
    return true;
  }

  // Karena GAS POST sering terkendala preflight, cara standar adalah url-encoded form 
  let formParams = new URLSearchParams();
  formParams.append("action", "save_laporan");
  formParams.append("id", laporanObj.id);
  formParams.append("userId", laporanObj.userId);
  formParams.append("periodeId", laporanObj.periodeId);
  formParams.append("bidang", laporanObj.bidang);
  formParams.append("status", laporanObj.status);
  formParams.append("kegiatan_dilakukan", laporanObj.kegiatan_dilakukan);
  formParams.append("rencana_kedepan", laporanObj.rencana_kedepan);
  formParams.append("dokumentasi", JSON.stringify(laporanObj.dokumentasi));
  formParams.append("createdAt", laporanObj.createdAt);
  formParams.append("updatedAt", laporanObj.updatedAt);

  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formParams
    });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);
    return true;
  } catch (err) {
    console.error("Save error:", err);
    throw err;
  }
}

// Post Image Base64 to GAS
async function postUploadPhoto(base64Str, filename) {
  if (GAS_URL.includes("GANTI_DENGAN")) {
    return "https://via.placeholder.com/600x400/eeeeee/aaaaaa?text=Local+Sim+Photo";
  }

  const parts = base64Str.split(';base64,');
  const mimeType = parts[0].split(':')[1];
  const rawBase64 = parts[1];

  let formParams = new URLSearchParams();
  formParams.append("action", "upload_photo");
  formParams.append("filename", filename);
  formParams.append("mimeType", mimeType);
  formParams.append("base64", rawBase64);

  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formParams
    });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);
    return result.url; // GDrive URL
  } catch (err) {
    console.error("Upload error:", err);
    throw err;
  }
}
