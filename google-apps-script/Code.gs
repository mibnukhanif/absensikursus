/**
 * ==============================================================================
 * DIGITALMEERA ABSENSI - GOOGLE APPS SCRIPT WEBHOOK BRIDGE (Code.gs)
 * ==============================================================================
 * Script ini dipasang pada Google Spreadsheet untuk menerima sinkronisasi data
 * absensi murid, pendaftaran murid, admin, dan pengaturan sistem secara real-time.
 *
 * ID SPREADSHEET ANDA: 1Mv6cw3CrjCVW7o42lM87iN98D0i0p4ClaCCHrg9i1Ek
 * ==============================================================================
 */

// ID Spreadsheet resmi Digitalmeera
var SPREADSHEET_ID = "1Mv6cw3CrjCVW7o42lM87iN98D0i0p4ClaCCHrg9i1Ek";

// Secret token (Dikosongkan agar tidak ada kendala token mismatch saat pengiriman data dari web)
var API_SECRET_TOKEN = "";

/**
 * Mendapatkan referensi Spreadsheet (Mendukung Standalone Script maupun Container-Bound)
 */
function getSpreadsheet(payload) {
  var id = (payload && payload.sheetId) || SPREADSHEET_ID;
  if (id && id.trim() !== "") {
    try {
      return SpreadsheetApp.openById(id.trim());
    } catch (e) {
      Logger.log("openById error: " + e);
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("Tidak dapat membuka spreadsheet. Pastikan SPREADSHEET_ID benar: " + e);
  }
}

/**
 * Inisialisasi awal struktur tabel & header Google Spreadsheet
 * Jalankan fungsi ini sekali melalui menu "Run" di Apps Script.
 */
function initSheets() {
  var ss = getSpreadsheet();
  
  var sheetsDef = [
    {
      name: "ABSENSI",
      headers: ["ID_ABSENSI", "ID_MURID", "NIS", "NAMA", "KELAS", "TANGGAL", "JAM", "STATUS", "QR_ID", "TIMESTAMP"],
      color: "#047857" // Emerald
    },
    {
      name: "MURID",
      headers: ["ID_MURID", "NIS", "NAMA", "KELAS", "AUTH_ID", "NO_HP", "STATUS", "TANGGAL_DAFTAR"],
      color: "#1d4ed8" // Blue
    },
    {
      name: "ADMIN",
      headers: ["ID_ADMIN", "AUTH_ID", "NAMA", "ROLE", "STATUS"],
      color: "#4338ca" // Indigo
    },
    {
      name: "SETTINGS",
      headers: ["KEY", "VALUE"],
      color: "#374151" // Gray
    }
  ];

  sheetsDef.forEach(function(item) {
    var sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
    }
    
    // Pasang header jika sheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(item.headers);
      var headerRange = sheet.getRange(1, 1, 1, item.headers.length);
      headerRange.setBackground(item.color);
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  });

  // Hapus Sheet1 default jika kosong
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log("Inisialisasi tabel Digitalmeera Absensi selesai!");
}

/**
 * Handle GET Request (Health Check / Test koneksi dari browser)
 */
function doGet(e) {
  return responseJSON({
    success: true,
    message: "Digitalmeera Absensi Google Apps Script Webhook is Active & Ready!",
    spreadsheetId: SPREADSHEET_ID,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle POST Request (Menerima data dari web aplikasi di Vercel / server)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, message: "Payload request kosong." });
    }

    var payload = JSON.parse(e.postData.contents);

    // Validasi token keamanan hanya jika API_SECRET_TOKEN diisi khusus
    if (API_SECRET_TOKEN && API_SECRET_TOKEN.trim() !== "") {
      var clientToken = payload.token || "";
      if (clientToken !== API_SECRET_TOKEN) {
        return responseJSON({ success: false, message: "Autentikasi token tidak valid." });
      }
    }

    var action = payload.action;
    var data = payload.data;
    var ss = getSpreadsheet(payload);

    switch (action) {
      case "PING":
        return responseJSON({
          success: true,
          message: "Koneksi ke Google Spreadsheet berhasil terhubung!",
          sheetName: ss.getName(),
          spreadsheetId: ss.getId()
        });

      case "RECORD_ATTENDANCE":
        return handleRecordAttendance(ss, data);

      case "ADD_MURID":
      case "UPDATE_MURID":
        return handleSaveSingleMurid(ss, data);

      case "SYNC_MURID":
        return handleSyncMurid(ss, data);

      case "ADD_ADMIN":
        return handleAddAdmin(ss, data);

      case "SYNC_ALL":
        return handleSyncAll(ss, data);

      case "UPDATE_SETTINGS":
        return handleUpdateSettings(ss, data);

      default:
        return responseJSON({ success: false, message: "Aksi tidak dikenali: " + action });
    }
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return responseJSON({
      success: false,
      message: "Terjadi kesalahan server script: " + err.toString()
    });
  }
}

/**
 * Catat baris presensi baru ke tab "ABSENSI"
 */
function handleRecordAttendance(ss, item) {
  if (!item) return responseJSON({ success: false, message: "Data absensi kosong." });

  var sheet = getOrCreateSheet(ss, "ABSENSI", [
    "ID_ABSENSI", "ID_MURID", "NIS", "NAMA", "KELAS", "TANGGAL", "JAM", "STATUS", "QR_ID", "TIMESTAMP"
  ]);

  sheet.appendRow([
    item.id || "",
    item.muridId || "",
    item.nis || "",
    item.nama || "",
    item.kelas || "",
    item.tanggal || "",
    item.jam || "",
    item.status || "Hadir",
    item.qrId || "",
    item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()
  ]);

  return responseJSON({
    success: true,
    message: "Absensi " + item.nama + " berhasil dicatat ke Google Sheets.",
    row: sheet.getLastRow()
  });
}

/**
 * Tambah / update satu murid ke tab "MURID"
 */
function handleSaveSingleMurid(ss, m) {
  if (!m) return responseJSON({ success: false, message: "Data murid kosong." });

  var sheet = getOrCreateSheet(ss, "MURID", [
    "ID_MURID", "NIS", "NAMA", "KELAS", "AUTH_ID", "NO_HP", "STATUS", "TANGGAL_DAFTAR"
  ]);

  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

  // Cek apakah NIS atau ID Murid sudah ada di sheet
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(m.id) || String(data[i][1]) === String(m.nis)) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  var rowValues = [
    m.id || "",
    m.nis || "",
    m.nama || "",
    m.kelas || "",
    m.username || m.nis || "",
    m.noHp || "",
    m.status || "aktif",
    m.tanggalDaftar || new Date().toISOString().split("T")[0]
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return responseJSON({
    success: true,
    message: "Data murid " + m.nama + " berhasil disimpan ke Google Sheets."
  });
}

/**
 * Sinkronisasi seluruh daftar murid ke tab "MURID"
 */
function handleSyncMurid(ss, muridList) {
  if (!muridList || !Array.isArray(muridList)) {
    return responseJSON({ success: false, message: "Format daftar murid harus array." });
  }

  var sheet = getOrCreateSheet(ss, "MURID", [
    "ID_MURID", "NIS", "NAMA", "KELAS", "AUTH_ID", "NO_HP", "STATUS", "TANGGAL_DAFTAR"
  ]);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  var rows = muridList.map(function(m) {
    return [
      m.id || "",
      m.nis || "",
      m.nama || "",
      m.kelas || "",
      m.username || m.nis || "",
      m.noHp || "",
      m.status || "aktif",
      m.tanggalDaftar || ""
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return responseJSON({
    success: true,
    message: "Sinkronisasi " + rows.length + " murid berhasil disimpan ke spreadsheet."
  });
}

/**
 * Catat / Perbarui akun Admin ke tab "ADMIN"
 */
function handleAddAdmin(ss, adminUser) {
  if (!adminUser) return responseJSON({ success: false, message: "Data admin kosong." });

  var sheet = getOrCreateSheet(ss, "ADMIN", [
    "ID_ADMIN", "AUTH_ID", "NAMA", "ROLE", "STATUS"
  ]);

  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

  // Cek apakah admin sudah ada berdasarkan ID atau Email/Username
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowId = String(data[i][0]);
      var rowAuth = String(data[i][1]);
      if (
        (adminUser.id && rowId === String(adminUser.id)) ||
        (adminUser.email && rowAuth.indexOf(adminUser.email) !== -1) ||
        (adminUser.username && rowAuth.indexOf(adminUser.username) !== -1)
      ) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  // Format AUTH_ID: "username (email)"
  var authId = adminUser.username
    ? (adminUser.username + (adminUser.email ? " (" + adminUser.email + ")" : ""))
    : (adminUser.email || "");

  var rowValues = [
    adminUser.id || ("admin-" + new Date().getTime()),
    authId,
    adminUser.name || "Administrator",
    adminUser.role || "admin",
    "aktif"
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return responseJSON({
    success: true,
    message: "Data admin " + (adminUser.name || "") + " [" + authId + "] berhasil disimpan ke Google Sheets."
  });
}

/**
 * Full Sync: Salin seluruh data murid, riwayat absensi, admin, dan settings
 */
function handleSyncAll(ss, fullData) {
  if (!fullData) return responseJSON({ success: false, message: "Data kosong." });

  // 1. Sync Murid
  if (fullData.murid && Array.isArray(fullData.murid)) {
    handleSyncMurid(ss, fullData.murid);
  }

  // 2. Sync Absensi
  if (fullData.attendance && Array.isArray(fullData.attendance)) {
    var sheetAtt = getOrCreateSheet(ss, "ABSENSI", [
      "ID_ABSENSI", "ID_MURID", "NIS", "NAMA", "KELAS", "TANGGAL", "JAM", "STATUS", "QR_ID", "TIMESTAMP"
    ]);

    if (sheetAtt.getLastRow() > 1) {
      sheetAtt.getRange(2, 1, sheetAtt.getLastRow() - 1, sheetAtt.getLastColumn()).clearContent();
    }

    var attRows = fullData.attendance.map(function(item) {
      return [
        item.id || "",
        item.muridId || "",
        item.nis || "",
        item.nama || "",
        item.kelas || "",
        item.tanggal || "",
        item.jam || "",
        item.status || "Hadir",
        item.qrId || "",
        item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()
      ];
    });

    if (attRows.length > 0) {
      sheetAtt.getRange(2, 1, attRows.length, attRows[0].length).setValues(attRows);
    }
  }

  // 3. Sync Admin (Tanpa password untuk keamanan)
  if (fullData.admins && Array.isArray(fullData.admins)) {
    var sheetAdmin = getOrCreateSheet(ss, "ADMIN", [
      "ID_ADMIN", "AUTH_ID", "NAMA", "ROLE", "STATUS"
    ]);

    if (sheetAdmin.getLastRow() > 1) {
      sheetAdmin.getRange(2, 1, sheetAdmin.getLastRow() - 1, sheetAdmin.getLastColumn()).clearContent();
    }

    var adminRows = fullData.admins.map(function(a) {
      return [
        a.id || "",
        a.email || a.username || "",
        a.name || "",
        a.role || "admin",
        "aktif"
      ];
    });

    if (adminRows.length > 0) {
      sheetAdmin.getRange(2, 1, adminRows.length, adminRows[0].length).setValues(adminRows);
    }
  }

  // 4. Sync Settings
  if (fullData.settings) {
    handleUpdateSettings(ss, fullData.settings);
  }

  return responseJSON({
    success: true,
    message: "Sinkronisasi menyeluruh ke Google Spreadsheet berhasil!"
  });
}

/**
 * Simpan pengaturan sistem ke sheet "SETTINGS"
 */
function handleUpdateSettings(ss, settingsObj) {
  var sheet = getOrCreateSheet(ss, "SETTINGS", ["KEY", "VALUE"]);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  var rows = [];
  for (var key in settingsObj) {
    if (settingsObj.hasOwnProperty(key)) {
      if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")) continue;
      rows.push([key, String(settingsObj[key])]);
    }
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return responseJSON({ success: true, message: "Pengaturan berhasil disimpan di spreadsheet." });
}

function getOrCreateSheet(ss, sheetName, defaultHeaders) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(defaultHeaders);
    var hRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
    hRange.setBackground("#064E3B");
    hRange.setFontColor("#FFFFFF");
    hRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
