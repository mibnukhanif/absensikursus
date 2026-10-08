/**
 * ==============================================================================
 * DIGITALMEERA ABSENSI - GOOGLE APPS SCRIPT WEBHOOK BRIDGE (Code.gs)
 * ==============================================================================
 * Script ini dipasang pada Google Spreadsheet untuk menerima sinkronisasi data
 * absensi, data murid, admin, dan pengaturan secara otomatis dari web app di Vercel.
 *
 * CARA PEMASANGAN:
 * 1. Buka Google Spreadsheet baru di browser (sheets.new).
 * 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 3. Hapus kode bawaan (myFunction) dan paste seluruh isi file ini ke "Code.gs".
 * 4. (Opsional) Ubah API_SECRET_TOKEN di bawah ini dengan token rahasia pilihan Anda.
 * 5. Jalankan fungsi "initSheets()" sekali melalui tombol Run di atas untuk membuat tab otomatis.
 * 6. Klik tombol biru "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 7. Pilih tipe: "Web app" (Aplikasi web).
 * 8. Konfigurasi:
 *    - Description: "Digitalmeera Absensi Webhook v1"
 *    - Execute as: "Me" (Saya / email Anda)
 *    - Who has access: "Anyone" (Siapa saja / Anonim) --> PENTING agar Vercel bisa mengirim data!
 * 9. Klik "Deploy", beri izin akses Google jika diminta, lalu salin "Web App URL"
 *    (Contoh: https://script.google.com/macros/s/AKfycbx.../exec).
 * 10. Masukkan Web App URL tersebut ke menu Pengaturan di Dashboard Admin Digitalmeera.
 * ==============================================================================
 */

// Ganti token ini dengan string rahasia yang sama dengan yang diisi di Pengaturan Admin (opsional jika dikosongkan)
var API_SECRET_TOKEN = "DIGITALMEERA_SECRET_SHEET_KEY";

/**
 * Inisialisasi awal struktur tabel & header Google Spreadsheet
 * Jalankan fungsi ini sekali dari editor Apps Script untuk memformat sheet secara otomatis.
 */
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Format Header Sheets
  var sheetsDef = [
    {
      name: "ABSENSI",
      headers: ["ID_ABSENSI", "ID_MURID", "NIS", "NAMA", "KELAS", "TANGGAL", "JAM", "STATUS", "QR_ID", "TIMESTAMP"],
      color: "#047857" // Emerald header
    },
    {
      name: "MURID",
      headers: ["ID_MURID", "NIS", "NAMA", "KELAS", "AUTH_ID", "NO_HP", "STATUS", "TANGGAL_DAFTAR"],
      color: "#1d4ed8" // Blue header
    },
    {
      name: "ADMIN",
      headers: ["ID_ADMIN", "AUTH_ID", "NAMA", "ROLE", "STATUS"],
      color: "#4338ca" // Indigo header
    },
    {
      name: "SETTINGS",
      headers: ["KEY", "VALUE"],
      color: "#374151" // Gray header
    }
  ];

  sheetsDef.forEach(function(item) {
    var sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
    }
    
    // Periksa apakah baris header sudah ada
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
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  Logger.log("Inisialisasi tabel Digitalmeera Absensi selesai!");
}

/**
 * Handle GET Request (Untuk tes koneksi dari browser atau webhook health check)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Digitalmeera Absensi Google Apps Script Webhook is Active & Ready!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST Request (Menerima pengiriman data dari server Vercel)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, message: "Payload request kosong." });
    }

    var payload = JSON.parse(e.postData.contents);

    // 1. Validasi Token Keamanan jika API_SECRET_TOKEN dikonfigurasi
    if (API_SECRET_TOKEN && API_SECRET_TOKEN.trim() !== "") {
      var clientToken = payload.token || "";
      if (clientToken !== API_SECRET_TOKEN) {
        return responseJSON({ success: false, message: "Autentikasi token tidak valid." });
      }
    }

    var action = payload.action;
    var data = payload.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 2. Routing Aksi
    switch (action) {
      case "PING":
        return responseJSON({
          success: true,
          message: "Koneksi ke Google Spreadsheet berhasil terhubung!",
          sheetName: ss.getName()
        });

      case "RECORD_ATTENDANCE":
        return handleRecordAttendance(ss, data);

      case "SYNC_MURID":
        return handleSyncMurid(ss, data);

      case "SYNC_ALL":
        return handleSyncAll(ss, data);

      case "UPDATE_SETTINGS":
        return handleUpdateSettings(ss, data);

      default:
        return responseJSON({ success: false, message: "Aksi tidak dikenali: " + action });
    }
  } catch (err) {
    return responseJSON({
      success: false,
      message: "Terjadi kesalahan server script: " + err.toString()
    });
  }
}

/**
 * Catat satu baris absensi baru ke sheet "ABSENSI"
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
 * Sinkronisasi seluruh murid ke sheet "MURID"
 */
function handleSyncMurid(ss, muridList) {
  if (!muridList || !Array.isArray(muridList)) {
    return responseJSON({ success: false, message: "Format daftar murid harus array." });
  }

  var sheet = getOrCreateSheet(ss, "MURID", [
    "ID_MURID", "NIS", "NAMA", "KELAS", "AUTH_ID", "NO_HP", "STATUS", "TANGGAL_DAFTAR"
  ]);

  // Bersihkan data lama selain header baris 1
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
    message: "Sinkronisasi " + rows.length + " murid berhasil disimpan."
  });
}

/**
 * Full Sync (Semua Murid, Riwayat Absensi, Admin, dan Settings)
 */
function handleSyncAll(ss, fullData) {
  if (!fullData) return responseJSON({ success: false, message: "Data kosong." });

  // 1. Sync Murid
  if (fullData.murid && Array.isArray(fullData.murid)) {
    handleSyncMurid(ss, fullData.murid);
  }

  // 2. Sync Attendance
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

  // 3. Sync Admin (Tanpa Password!)
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
 * Update key-value ke sheet "SETTINGS"
 */
function handleUpdateSettings(ss, settingsObj) {
  var sheet = getOrCreateSheet(ss, "SETTINGS", ["KEY", "VALUE"]);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  var rows = [];
  for (var key in settingsObj) {
    if (settingsObj.hasOwnProperty(key)) {
      // Lewati secret token atau password
      if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")) continue;
      rows.push([key, String(settingsObj[key])]);
    }
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return responseJSON({ success: true, message: "Pengaturan berhasil diperbarui di spreadsheet." });
}

/**
 * Helper untuk mendapatkan atau membuat sheet dengan header
 */
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

/**
 * Helper JSON Response
 */
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
