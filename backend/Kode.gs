// ==========================================
// BACKEND GOOGLE APPS SCRIPT - MONITORING SE
// ==========================================

// GANTI DENGAN ID GOOGLE SHEET ANDA
// (Ambil string acak di URL Sheet antara /d/ dan /edit)
var SPREADSHEET_ID = "1343kgBhVzWoOdHJVCj1Xaz8oLGPr8Uv5rtwtXmDRDUo"; 

// GANTI DENGAN FOLDER ID FOTO DRIVE ANDA
var FOLDER_ID = "1jkG-cy3Dv7Zto1THWr81ILkjVGWTeXEt";

function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Ambil Data Users
    var sheetUsers = ss.getSheetByName("Users");
    if (!sheetUsers) throw new Error("Sheet 'Users' tidak ditemukan");
    var usersData = getSheetDataAsJson(sheetUsers);
    
    // 2. Ambil Data Laporan
    var sheetLaporan = ss.getSheetByName("Laporan");
    if (!sheetLaporan) throw new Error("Sheet 'Laporan' tidak ditemukan");
    var laporanData = getSheetDataAsJson(sheetLaporan);
    
    // Parse dokumentasi string JSON -> object
    laporanData = laporanData.map(function(l) {
      if (l.dokumentasi) {
        try { l.dokumentasi = JSON.parse(l.dokumentasi); } 
        catch (e) { l.dokumentasi = []; }
      } else {
        l.dokumentasi = [];
      }
      return l;
    });

    var result = {
      status: "success",
      data: {
        users: usersData,
        laporan: laporanData
      }
    };
    
    return buildResponse(result);
  } catch (error) {
    return buildResponse({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    var params = e.parameter;
    var action = params.action;
    
    if (action === "upload_photo") {
      var data = Utilities.base64Decode(params.base64);
      var blob = Utilities.newBlob(data, params.mimeType, params.filename);
      var folder = DriveApp.getFolderById(FOLDER_ID);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return buildResponse({ status: "success", url: "https://drive.google.com/uc?export=view&id=" + file.getId() });
    }
    
    if (action === "save_laporan") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName("Laporan");
      if (!sheet) throw new Error("Sheet 'Laporan' tidak ditemukan");
      
      var id = params.id;
      var userId = params.userId;
      var periodeId = params.periodeId;
      var bidang = params.bidang;
      var status = params.status;
      var kegiatan_dilakukan = params.kegiatan_dilakukan;
      var rencana_kedepan = params.rencana_kedepan;
      var dokumentasiJSON = params.dokumentasi; 
      var updatedAt = params.updatedAt;
      var createdAt = params.createdAt;
      
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var rowIndexToUpdate = -1;
      
      var idIndex = headers.indexOf("id");
      if (idIndex === -1) throw new Error("Kolom 'id' tidak ditemukan di Laporan");
      
      // Cek apakah laporan dengan ID ini sudah ada
      for (var i = 1; i < values.length; i++) {
        if (values[i][idIndex] == id) {
          rowIndexToUpdate = i + 1; // +1 karena index row sheet mulai dari 1
          break;
        }
      }
      
      var rowData = [
        id, userId, periodeId, bidang, status, 
        kegiatan_dilakukan, rencana_kedepan, dokumentasiJSON, 
        createdAt, updatedAt
      ];
      
      if (rowIndexToUpdate > -1) {
        // Update baris lama
        sheet.getRange(rowIndexToUpdate, 1, 1, headers.length).setValues([rowData]);
      } else {
        // Buat baris baru
        sheet.appendRow(rowData);
      }
      
      return buildResponse({ status: "success", message: "Laporan berhasil disimpan" });
    }
    
    throw new Error("Action tidak dikenal");
    
  } catch (error) {
    return buildResponse({ status: "error", message: error.toString() });
  }
}

// === Helper Functions ===

function buildResponse(obj) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

function getSheetDataAsJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j] : "";
    }
    result.push(obj);
  }
  return result;
}
