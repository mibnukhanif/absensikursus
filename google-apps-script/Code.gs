/**
 * ==============================================================================
 * DIGITALMEERA ABSENSI - GOOGLE APPS SCRIPT WEBHOOK BRIDGE (Code.gs)
 * ==============================================================================
 * ID SPREADSHEET: 1Mv6cw3CrjCVW7o42lM87iN98D0i0p4ClaCCHrg9i1Ek
 *
 * FITUR UTAMA:
 * 1. Manajemen Kredensial Admin & Murid (Bisa diubah langsung di bawah).
 * 2. Pengaturan Shift Jam Presensi (Bisa ditambah/diubah langsung di bawah).
 * 3. Titik Koordinat GPS Sekolah & Geofencing Maps (Otomatis tercatat ke Spreadsheet).
 *
 * PANDUAN PENGGUNAAN:
 * 1. Ubah konfigurasi Admin, Murid, Shift, atau Koordinat Lokasi di bawah jika diinginkan.
 * 2. Klik tombol "Save" (Disket) di Apps Script.
 * 3. Pilih fungsi "initSheets" atau "resetDefaultCredentials" di dropdown toolbar,
 *    lalu klik tombol "Run" (Jalankan) untuk memasukkan struktur tabel ke Google Spreadsheet.
 * ==============================================================================
 */

// ID Spreadsheet resmi Digitalmeera Anda
var SPREADSHEET_ID = "1Mv6cw3CrjCVW7o42lM87iN98D0i0p4ClaCCHrg9i1Ek";

// Token keamanan (Biarkan kosong agar tidak ada kendala token mismatch)
var API_SECRET_TOKEN = "";

// ==============================================================================
// 1. KREDENSIAL LOGIN ADMIN DEFAULT
// ==============================================================================
var DEFAULT_ADMIN = {
  id: "admin-primary",
  username: "admin",                     // <-- USERNAME LOGIN ADMIN
  email: "digitalmeera.com@gmail.com",   // <-- EMAIL LOGIN ADMIN
  password: "admin12345",                // <-- PASSWORD LOGIN ADMIN
  name: "Administrator Utama",
  role: "super_admin",
  status: "aktif"
};

// ==============================================================================
// 2. KREDENSIAL LOGIN MURID CONTOH / DEFAULT
// ==============================================================================
var DEFAULT_MURID_LIST = [
  {
    id: "murid-1001",
    nis: "1001",                         // <-- NIS / USERNAME MURID 1
    nama: "Ahmad Fauzi",
    kelas: "XII IPA 1",
    username: "1001",
    password: "1001",                    // <-- PASSWORD LOGIN MURID 1
    noHp: "081234567891",
    status: "aktif",
    tanggalDaftar: "2026-10-08"
  },
  {
    id: "murid-1002",
    nis: "1002",                         // <-- NIS / USERNAME MURID 2
    nama: "Siti Rahmawati",
    kelas: "XII IPA 1",
    username: "1002",
    password: "1002",                    // <-- PASSWORD LOGIN MURID 2
    noHp: "081234567892",
    status: "aktif",
    tanggalDaftar: "2026-10-08"
  }
];

// ==============================================================================
// 3. PENGATURAN TITIK KOORDINAT LOKASI SEKOLAH (GEOFENCING MAPS)
// Ubah koordinat latitude dan longitude lokasi sekolah Anda di sini.
// ==============================================================================
var TARGET_LOCATION = {
  latitude: -6.200000,         // <-- Latitude Titik Lokasi Sekolah
  longitude: 106.816666,       // <-- Longitude Titik Lokasi Sekolah
  radiusMeters: 100,           // <-- Batas maksimal radius presensi siswa (meter)
  enforceGeofence: false       // <-- true jika presensi wajib di dalam radius
};

// ==============================================================================
// 4. PENGATURAN SHIFT JAM BATAS PRESENSI
// Anda dapat menambah shift baru (misal Shift Sore) atau mengubah jam di sini.
// ==============================================================================
var DEFAULT_SHIFTS = [
  {
    id: "shift-pagi",
    nama: "Shift Pagi / Reguler",
    jamMasuk: "07:30",         // Jam batas keterlambatan
    jamPulang: "15:00",
    toleransiMenit: 0,
    aktif: true
  },
  {
    id: "shift-siang",
    nama: "Shift Siang",
    jamMasuk: "12:30",
    jamPulang: "17:30",
    toleransiMenit: 0,
    aktif: true
  }
];

/**
 * Membuka referensi Google Spreadsheet
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
 * Header Kolom untuk Seluruh Tab Spreadsheet
 */
var HEADERS_DEF = {
  ABSENSI: [
    "ID_ABSENSI", "ID_MURID", "NIS", "NAMA", "KELAS", "TANGGAL", "JAM",
    "SHIFT", "STATUS", "LATITUDE", "LONGITUDE", "JARAK_METER", "LOKASI_MAPS",
    "QR_ID", "TIMESTAMP"
  ],
  MURID: [
    "ID_MURID", "NIS", "NAMA", "KELAS", "USERNAME", "PASSWORD", "NO_HP", "STATUS", "TANGGAL_DAFTAR"
  ],
  ADMIN: [
    "ID_ADMIN", "USERNAME", "EMAIL", "PASSWORD", "NAMA", "ROLE", "STATUS"
  ],
  SETTINGS: [
    "KEY", "VALUE"
  ]
};

/**
 * INISIALISASI AWAL TABEL & KREDENSIAL KE SPREADSHEET
 * Jalankan fungsi ini di Apps Script untuk membuat sheet dan mengisi admin & murid pertama!
 */
function initSheets() {
  var ss = getSpreadsheet();

  // 1. Sheet ABSENSI (Dengan Kolom Titik Koordinat, Shift, & Link Maps)
  var sheetAbsensi = getOrCreateSheet(ss, "ABSENSI", HEADERS_DEF.ABSENSI, "#047857");

  // Jika sheet absensi lama belum punya kolom LATITUDE/LONGITUDE, perbarui headernya
  if (sheetAbsensi.getLastRow() >= 1 && sheetAbsensi.getLastColumn() < HEADERS_DEF.ABSENSI.length) {
    sheetAbsensi.getRange(1, 1, 1, HEADERS_DEF.ABSENSI.length).setValues([HEADERS_DEF.ABSENSI]);
    var hRange = sheetAbsensi.getRange(1, 1, 1, HEADERS_DEF.ABSENSI.length);
    hRange.setBackground("#047857");
    hRange.setFontColor("#FFFFFF");
    hRange.setFontWeight("bold");
    sheetAbsensi.setFrozenRows(1);
    Logger.log("Header sheet ABSENSI berhasil diperbarui dengan kolom Koordinat & Maps!");
  }

  // 2. Sheet MURID
  var sheetMurid = getOrCreateSheet(ss, "MURID", HEADERS_DEF.MURID, "#1d4ed8");

  // 3. Sheet ADMIN
  var sheetAdmin = getOrCreateSheet(ss, "ADMIN", HEADERS_DEF.ADMIN, "#4338ca");

  // 4. Sheet SETTINGS
  var sheetSettings = getOrCreateSheet(ss, "SETTINGS", HEADERS_DEF.SETTINGS, "#374151");

  // Isi data Admin jika sheet ADMIN masih kosong (hanya header)
  if (sheetAdmin.getLastRow() <= 1) {
    sheetAdmin.appendRow([
      DEFAULT_ADMIN.id,
      DEFAULT_ADMIN.username,
      DEFAULT_ADMIN.email,
      DEFAULT_ADMIN.password,
      DEFAULT_ADMIN.name,
      DEFAULT_ADMIN.role,
      DEFAULT_ADMIN.status
    ]);
    Logger.log("Akun Admin default berhasil ditambahkan ke Sheet ADMIN!");
  }

  // Isi data Murid jika sheet MURID masih kosong (hanya header)
  if (sheetMurid.getLastRow() <= 1) {
    DEFAULT_MURID_LIST.forEach(function(m) {
      sheetMurid.appendRow([
        m.id,
        m.nis,
        m.nama,
        m.kelas,
        m.username || m.nis,
        m.password || m.nis,
        m.noHp || "",
        m.status || "aktif",
        m.tanggalDaftar || "2026-10-08"
      ]);
    });
    Logger.log("Akun Murid default berhasil ditambahkan ke Sheet MURID!");
  }

  // Isi data Settings jika sheet SETTINGS masih kosong
  if (sheetSettings.getLastRow() <= 1) {
    var defaultSettings = [
      ["appName", "DIGITALMEERA ABSENSI"],
      ["subTitle", "Sistem Absensi Digital Berbasis QR Code"],
      ["institutionName", "Lembaga Pendidikan Digitalmeera"],
      ["adminWhatsApp", "081234567890"],
      ["adminEmail", DEFAULT_ADMIN.email],
      ["targetLatitude", String(TARGET_LOCATION.latitude)],
      ["targetLongitude", String(TARGET_LOCATION.longitude)],
      ["radiusMeters", String(TARGET_LOCATION.radiusMeters)],
      ["enforceLocation", String(TARGET_LOCATION.enforceGeofence)],
      ["shiftsJson", JSON.stringify(DEFAULT_SHIFTS)],
      ["updatedAt", new Date().toISOString()]
    ];
    defaultSettings.forEach(function(pair) {
      sheetSettings.appendRow(pair);
    });
  }

  // Hapus Sheet1 default jika ada
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log("=================================================");
  Logger.log("Inisialisasi Spreadsheet Berhasil!");
  Logger.log("LOGIN ADMIN -> Username: " + DEFAULT_ADMIN.username + " | Password: " + DEFAULT_ADMIN.password);
  Logger.log("LOGIN MURID -> NIS: " + DEFAULT_MURID_LIST[0].nis + " | Password: " + DEFAULT_MURID_LIST[0].password);
  Logger.log("LOKASI SEKOLAH -> Lat: " + TARGET_LOCATION.latitude + ", Long: " + TARGET_LOCATION.longitude + " (" + TARGET_LOCATION.radiusMeters + "m)");
  Logger.log("=================================================");
}

/**
 * RESET / TULIS ULANG KREDENSIAL DARI KODE KE SPREADSHEET
 */
function resetDefaultCredentials() {
  var ss = getSpreadsheet();

  // Update Sheet ADMIN
  var sheetAdmin = getOrCreateSheet(ss, "ADMIN", HEADERS_DEF.ADMIN, "#4338ca");
  if (sheetAdmin.getLastRow() > 1) {
    sheetAdmin.getRange(2, 1, sheetAdmin.getLastRow() - 1, sheetAdmin.getLastColumn()).clearContent();
  }
  sheetAdmin.appendRow([
    DEFAULT_ADMIN.id,
    DEFAULT_ADMIN.username,
    DEFAULT_ADMIN.email,
    DEFAULT_ADMIN.password,
    DEFAULT_ADMIN.name,
    DEFAULT_ADMIN.role,
    DEFAULT_ADMIN.status
  ]);

  // Update Sheet MURID
  var sheetMurid = getOrCreateSheet(ss, "MURID", HEADERS_DEF.MURID, "#1d4ed8");
  if (sheetMurid.getLastRow() > 1) {
    sheetMurid.getRange(2, 1, sheetMurid.getLastRow() - 1, sheetMurid.getLastColumn()).clearContent();
  }
  DEFAULT_MURID_LIST.forEach(function(m) {
    sheetMurid.appendRow([
      m.id,
      m.nis,
      m.nama,
      m.kelas,
      m.username || m.nis,
      m.password || m.nis,
      m.noHp || "",
      m.status || "aktif",
      m.tanggalDaftar || "2026-10-08"
    ]);
  });

  Logger.log("Kredensial berhasil diperbarui di Spreadsheet!");
}

/**
 * Handle GET Request (Health Check & Cek Kredensial Langsung lewat Browser)
 */
function doGet(e) {
  return responseJSON({
    success: true,
    message: "Digitalmeera Absensi Google Apps Script Webhook is Active!",
    spreadsheetId: SPREADSHEET_ID,
    adminCredentials: {
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password
    },
    sampleMuridCredentials: {
      nis: DEFAULT_MURID_LIST[0].nis,
      password: DEFAULT_MURID_LIST[0].password,
      nama: DEFAULT_MURID_LIST[0].nama
    },
    targetLocation: TARGET_LOCATION,
    shifts: DEFAULT_SHIFTS,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle POST Request (Menerima permintaan dari web aplikasi)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, message: "Payload request kosong." });
    }

    var payload = JSON.parse(e.postData.contents);

    // Validasi token keamanan jika dipasang
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

      // 1. Verifikasi Login Admin langsung dari Spreadsheet
      case "VERIFY_ADMIN_LOGIN":
        return handleVerifyAdminLogin(ss, data);

      // 2. Verifikasi Login Murid langsung dari Spreadsheet
      case "VERIFY_MURID_LOGIN":
        return handleVerifyMuridLogin(ss, data);

      // 3. Ambil Semua User (Admin & Murid) untuk Sinkronisasi ke Web
      case "GET_USERS":
        return handleGetUsers(ss);

      // 4. Catat Kehadiran (Termasuk Titik Koordinat GPS, Jarak, Shift, & Link Maps)
      case "RECORD_ATTENDANCE":
        return handleRecordAttendance(ss, data);

      // 5. Simpan / Perbarui Murid
      case "ADD_MURID":
      case "UPDATE_MURID":
        return handleSaveSingleMurid(ss, data);

      // 6. Sinkronisasi Seluruh Murid
      case "SYNC_MURID":
        return handleSyncMurid(ss, data);

      // 7. Simpan / Perbarui Admin
      case "ADD_ADMIN":
      case "UPDATE_ADMIN":
        return handleSaveAdmin(ss, data);

      // 8. Sinkronisasi Penuh
      case "SYNC_ALL":
        return handleSyncAll(ss, data);

      // 9. Update Settings
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
 * Catat baris presensi baru ke tab "ABSENSI" dengan koordinat & link maps
 */
function handleRecordAttendance(ss, item) {
  if (!item) return responseJSON({ success: false, message: "Data absensi kosong." });

  var sheet = getOrCreateSheet(ss, "ABSENSI", HEADERS_DEF.ABSENSI, "#047857");

  // Format link Google Maps
  var mapsUrl = item.mapsUrl || "";
  if (!mapsUrl && item.latitude && item.longitude) {
    mapsUrl = "https://www.google.com/maps?q=" + item.latitude + "," + item.longitude;
  }

  var jarakText = "";
  if (item.jarakMeter !== null && item.jarakMeter !== undefined && item.jarakMeter !== "") {
    jarakText = String(item.jarakMeter) + " m";
  }

  sheet.appendRow([
    item.id || "",
    item.muridId || "",
    item.nis || "",
    item.nama || "",
    item.kelas || "",
    item.tanggal || "",
    item.jam || "",
    item.shift || "Shift Reguler",
    item.status || "Hadir",
    item.latitude !== null && item.latitude !== undefined ? item.latitude : "",
    item.longitude !== null && item.longitude !== undefined ? item.longitude : "",
    jarakText,
    mapsUrl,
    item.qrId || "",
    item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()
  ]);

  return responseJSON({
    success: true,
    message: "Absensi " + item.nama + " berhasil dicatat ke Google Sheets dengan titik koordinat.",
    row: sheet.getLastRow()
  });
}

/**
 * Verifikasi login Admin berdasarkan data di Sheet ADMIN atau DEFAULT_ADMIN
 */
function handleVerifyAdminLogin(ss, data) {
  if (!data || !data.identifier || !data.password) {
    return responseJSON({ success: false, message: "Identifier dan password wajib diisi." });
  }

  var identifier = String(data.identifier).trim().toLowerCase();
  var password = String(data.password).trim();

  var sheet = ss.getSheetByName("ADMIN");

  if (!sheet || sheet.getLastRow() <= 1) {
    if (
      (identifier === DEFAULT_ADMIN.username.toLowerCase() || identifier === DEFAULT_ADMIN.email.toLowerCase()) &&
      password === String(DEFAULT_ADMIN.password)
    ) {
      return responseJSON({
        success: true,
        message: "Login berhasil menggunakan kredensial default.",
        admin: DEFAULT_ADMIN
      });
    }
    return responseJSON({ success: false, message: "Username atau password admin salah." });
  }

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || "");
    var username = String(row[1] || "").trim().toLowerCase();
    var email = String(row[2] || "").trim().toLowerCase();
    var passInSheet = String(row[3] || "").trim();
    var name = String(row[4] || "");
    var role = String(row[5] || "super_admin");
    var status = String(row[6] || "aktif");

    if (
      (identifier === username || identifier === email) &&
      password === passInSheet
    ) {
      return responseJSON({
        success: true,
        message: "Login admin berhasil via Spreadsheet.",
        admin: {
          id: id || ("admin-" + i),
          username: username,
          email: email,
          name: name || "Administrator",
          role: role,
          status: status
        }
      });
    }
  }

  if (
    (identifier === DEFAULT_ADMIN.username.toLowerCase() || identifier === DEFAULT_ADMIN.email.toLowerCase()) &&
    password === String(DEFAULT_ADMIN.password)
  ) {
    return responseJSON({
      success: true,
      message: "Login berhasil via default admin.",
      admin: DEFAULT_ADMIN
    });
  }

  return responseJSON({ success: false, message: "Username/Email atau kata sandi admin salah." });
}

/**
 * Verifikasi login Murid berdasarkan data di Sheet MURID atau DEFAULT_MURID_LIST
 */
function handleVerifyMuridLogin(ss, data) {
  if (!data || !data.identifier || !data.password) {
    return responseJSON({ success: false, message: "Identifier dan password murid wajib diisi." });
  }

  var identifier = String(data.identifier).trim().toLowerCase();
  var password = String(data.password).trim();

  var sheet = ss.getSheetByName("MURID");

  if (!sheet || sheet.getLastRow() <= 1) {
    for (var d = 0; d < DEFAULT_MURID_LIST.length; d++) {
      var dm = DEFAULT_MURID_LIST[d];
      if (
        (identifier === dm.nis.toLowerCase() || identifier === (dm.username || dm.nis).toLowerCase()) &&
        password === String(dm.password)
      ) {
        return responseJSON({
          success: true,
          message: "Login murid berhasil via default list.",
          murid: dm
        });
      }
    }
    return responseJSON({ success: false, message: "Akun murid tidak ditemukan." });
  }

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || "");
    var nis = String(row[1] || "").trim();
    var nama = String(row[2] || "").trim();
    var kelas = String(row[3] || "").trim();
    var username = String(row[4] || "").trim().toLowerCase();
    var passInSheet = String(row[5] || "").trim();
    var noHp = String(row[6] || "").trim();
    var status = String(row[7] || "aktif").trim();

    if (
      (identifier === nis.toLowerCase() || identifier === username) &&
      password === passInSheet
    ) {
      if (status.toLowerCase() !== "aktif") {
        return responseJSON({ success: false, message: "Akun murid ini sedang dinonaktifkan." });
      }
      return responseJSON({
        success: true,
        message: "Login murid berhasil via Spreadsheet.",
        murid: {
          id: id || ("murid-" + nis),
          nis: nis,
          nama: nama,
          kelas: kelas,
          username: username || nis,
          noHp: noHp,
          status: status
        }
      });
    }
  }

  for (var k = 0; k < DEFAULT_MURID_LIST.length; k++) {
    var km = DEFAULT_MURID_LIST[k];
    if (
      (identifier === km.nis.toLowerCase() || identifier === (km.username || km.nis).toLowerCase()) &&
      password === String(km.password)
    ) {
      return responseJSON({
        success: true,
        message: "Login murid berhasil via default list.",
        murid: km
      });
    }
  }

  return responseJSON({ success: false, message: "NIS/Username atau kata sandi murid salah." });
}

/**
 * Mengambil seluruh data user (Admin & Murid) untuk disinkronkan ke Web Application
 */
function handleGetUsers(ss) {
  var admins = [];
  var murid = [];

  var sheetAdmin = ss.getSheetByName("ADMIN");
  if (sheetAdmin && sheetAdmin.getLastRow() > 1) {
    var aRows = sheetAdmin.getRange(2, 1, sheetAdmin.getLastRow() - 1, 7).getValues();
    for (var i = 0; i < aRows.length; i++) {
      var r = aRows[i];
      if (r[1] || r[2]) {
        admins.push({
          id: String(r[0] || ("admin-" + i)),
          username: String(r[1] || "admin"),
          email: String(r[2] || ""),
          password: String(r[3] || ""),
          name: String(r[4] || "Administrator"),
          role: String(r[5] || "super_admin"),
          status: String(r[6] || "aktif")
        });
      }
    }
  }
  if (admins.length === 0) admins.push(DEFAULT_ADMIN);

  var sheetMurid = ss.getSheetByName("MURID");
  if (sheetMurid && sheetMurid.getLastRow() > 1) {
    var mRows = sheetMurid.getRange(2, 1, sheetMurid.getLastRow() - 1, 9).getValues();
    for (var j = 0; j < mRows.length; j++) {
      var mr = mRows[j];
      if (mr[1]) {
        murid.push({
          id: String(mr[0] || ("murid-" + mr[1])),
          nis: String(mr[1]),
          nama: String(mr[2] || ""),
          kelas: String(mr[3] || ""),
          username: String(mr[4] || mr[1]),
          password: String(mr[5] || mr[1]),
          noHp: String(mr[6] || ""),
          status: String(mr[7] || "aktif"),
          tanggalDaftar: String(mr[8] || "")
        });
      }
    }
  }
  if (murid.length === 0) murid = DEFAULT_MURID_LIST;

  return responseJSON({
    success: true,
    data: {
      admins: admins,
      murid: murid
    }
  });
}

/**
 * Tambah / update satu murid ke tab "MURID"
 */
function handleSaveSingleMurid(ss, m) {
  if (!m) return responseJSON({ success: false, message: "Data murid kosong." });

  var sheet = getOrCreateSheet(ss, "MURID", HEADERS_DEF.MURID, "#1d4ed8");
  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

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
    m.password || m.nis || "",
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

  var sheet = getOrCreateSheet(ss, "MURID", HEADERS_DEF.MURID, "#1d4ed8");

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
      m.password || m.nis || "",
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
 * Simpan / perbarui akun Admin ke tab "ADMIN"
 */
function handleSaveAdmin(ss, adminUser) {
  if (!adminUser) return responseJSON({ success: false, message: "Data admin kosong." });

  var sheet = getOrCreateSheet(ss, "ADMIN", HEADERS_DEF.ADMIN, "#4338ca");
  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowId = String(data[i][0]);
      var rowUser = String(data[i][1]);
      var rowEmail = String(data[i][2]);
      if (
        (adminUser.id && rowId === String(adminUser.id)) ||
        (adminUser.email && rowEmail.toLowerCase() === adminUser.email.toLowerCase()) ||
        (adminUser.username && rowUser.toLowerCase() === adminUser.username.toLowerCase())
      ) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  var rowValues = [
    adminUser.id || ("admin-" + new Date().getTime()),
    adminUser.username || "admin",
    adminUser.email || DEFAULT_ADMIN.email,
    adminUser.password || DEFAULT_ADMIN.password,
    adminUser.name || "Administrator Utama",
    adminUser.role || "super_admin",
    adminUser.status || "aktif"
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return responseJSON({
    success: true,
    message: "Akun admin " + (adminUser.username || "") + " berhasil disimpan ke Spreadsheet."
  });
}

/**
 * Sinkronisasi Penuh (Sync All)
 */
function handleSyncAll(ss, fullData) {
  if (!fullData) return responseJSON({ success: false, message: "Data kosong." });

  // 1. Sync Murid
  if (fullData.murid && Array.isArray(fullData.murid)) {
    handleSyncMurid(ss, fullData.murid);
  }

  // 2. Sync Absensi (Termasuk Kolom Titik Koordinat & Maps)
  if (fullData.attendance && Array.isArray(fullData.attendance)) {
    var sheetAtt = getOrCreateSheet(ss, "ABSENSI", HEADERS_DEF.ABSENSI, "#047857");

    if (sheetAtt.getLastRow() > 1) {
      sheetAtt.getRange(2, 1, sheetAtt.getLastRow() - 1, sheetAtt.getLastColumn()).clearContent();
    }

    var attRows = fullData.attendance.map(function(item) {
      var mapsUrl = item.mapsUrl || "";
      if (!mapsUrl && item.latitude && item.longitude) {
        mapsUrl = "https://www.google.com/maps?q=" + item.latitude + "," + item.longitude;
      }
      var jarakText = (item.jarakMeter !== null && item.jarakMeter !== undefined && item.jarakMeter !== "")
        ? (item.jarakMeter + " m") : "";

      return [
        item.id || "",
        item.muridId || "",
        item.nis || "",
        item.nama || "",
        item.kelas || "",
        item.tanggal || "",
        item.jam || "",
        item.shift || "Shift Reguler",
        item.status || "Hadir",
        item.latitude !== null && item.latitude !== undefined ? item.latitude : "",
        item.longitude !== null && item.longitude !== undefined ? item.longitude : "",
        jarakText,
        mapsUrl,
        item.qrId || "",
        item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()
      ];
    });

    if (attRows.length > 0) {
      sheetAtt.getRange(2, 1, attRows.length, attRows[0].length).setValues(attRows);
    }
  }

  // 3. Sync Admin
  if (fullData.admins && Array.isArray(fullData.admins)) {
    fullData.admins.forEach(function(a) {
      handleSaveAdmin(ss, a);
    });
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
  var sheet = getOrCreateSheet(ss, "SETTINGS", HEADERS_DEF.SETTINGS, "#374151");

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  var rows = [];
  for (var key in settingsObj) {
    if (settingsObj.hasOwnProperty(key)) {
      if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) continue;
      var val = settingsObj[key];
      if (typeof val === "object") {
        val = JSON.stringify(val);
      }
      rows.push([key, String(val)]);
    }
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return responseJSON({ success: true, message: "Pengaturan berhasil disimpan di spreadsheet." });
}

function getOrCreateSheet(ss, sheetName, defaultHeaders, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(defaultHeaders);
    var hRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
    hRange.setBackground(headerColor || "#064E3B");
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
