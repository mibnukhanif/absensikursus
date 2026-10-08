import { AttendanceRecord, MuridUser, AdminUser, SystemSettings, db } from './db.js';

export async function sendToGoogleSheets(
  action: string,
  payload: any
): Promise<{ success: boolean; message: string; data?: any }> {
  const settings = db.getSettings();

  const scriptUrl = settings.googleSheetsScriptUrl || 'https://script.google.com/macros/s/AKfycbybSkJPMQvRtFQFLhKyb76R1mxWPxM6N5kuhV4oGAhhQMuyQAogLtV8TJrRiCQbURQI/exec';

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        sheetId: settings.googleSheetsId || '1Mv6cw3CrjCVW7o42lM87iN98D0i0p4ClaCCHrg9i1Ek',
        token: settings.googleSheetsSecretToken || '',
        data: payload
      })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Gagal menghubungi Google Apps Script (${res.status})`
      };
    }

    return {
      success: !!data.success,
      message: data.message || 'Sinkronisasi berhasil diproses oleh Google Apps Script.',
      data
    };
  } catch (error: any) {
    console.error('Error syncing to Google Sheets:', error);
    return {
      success: false,
      message: 'Gagal terhubung ke Google Apps Script: ' + (error.message || 'Koneksi error')
    };
  }
}

/**
 * Verifikasi login Admin langsung ke Google Apps Script / Spreadsheet
 */
export async function verifyAdminWithSheets(
  identifier: string,
  password: string
): Promise<{ success: boolean; admin?: any; message?: string }> {
  try {
    const result = await sendToGoogleSheets('VERIFY_ADMIN_LOGIN', { identifier, password });
    if (result.success && result.data && result.data.admin) {
      return { success: true, admin: result.data.admin };
    }
    return { success: false, message: result.message || 'Kredensial tidak cocok di Spreadsheet.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Verifikasi login Murid langsung ke Google Apps Script / Spreadsheet
 */
export async function verifyMuridWithSheets(
  identifier: string,
  password: string
): Promise<{ success: boolean; murid?: any; message?: string }> {
  try {
    const result = await sendToGoogleSheets('VERIFY_MURID_LOGIN', { identifier, password });
    if (result.success && result.data && result.data.murid) {
      return { success: true, murid: result.data.murid };
    }
    return { success: false, message: result.message || 'Kredensial tidak cocok di Spreadsheet.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Tarik seluruh akun Admin dan Murid dari Google Spreadsheet
 */
export async function pullUsersFromSheets(): Promise<{
  success: boolean;
  admins?: any[];
  murid?: any[];
  message?: string;
}> {
  try {
    const result = await sendToGoogleSheets('GET_USERS', {});
    if (result.success && result.data && result.data.data) {
      return {
        success: true,
        admins: result.data.data.admins || [],
        murid: result.data.data.murid || []
      };
    }
    return { success: false, message: result.message || 'Gagal mengambil data user dari spreadsheet.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Tarik seluruh data (Admin, Murid, Absensi, Settings) dari Google Spreadsheet
 */
export async function pullAllDataFromSheets(): Promise<{
  success: boolean;
  data?: {
    admins?: any[];
    murid?: any[];
    attendance?: any[];
    settings?: any;
  };
  message?: string;
}> {
  try {
    // 1. Coba panggil GET_ALL_DATA
    const allRes = await sendToGoogleSheets('GET_ALL_DATA', {});
    if (allRes.success && allRes.data && allRes.data.data) {
      return {
        success: true,
        data: allRes.data.data,
        message: 'Berhasil menarik seluruh data dari Google Spreadsheet.'
      };
    }

    // 2. Fallback ke GET_USERS jika script belum di-update ke versi terbaru
    const usersRes = await sendToGoogleSheets('GET_USERS', {});
    if (usersRes.success && usersRes.data && usersRes.data.data) {
      return {
        success: true,
        data: {
          admins: usersRes.data.data.admins || [],
          murid: usersRes.data.data.murid || [],
          attendance: [],
          settings: {}
        },
        message: 'Berhasil menarik data pengguna dari Google Spreadsheet.'
      };
    }

    return {
      success: false,
      message: allRes.message || usersRes.message || 'Gagal menarik data dari Google Spreadsheet.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Koneksi ke spreadsheet gagal: ' + err.message
    };
  }
}

/**
 * Mirror attendance record to Google Sheets asynchronously
 */
export function asyncMirrorAttendanceToSheets(record: AttendanceRecord) {
  const payload = {
    id: record.id,
    muridId: record.muridId,
    nis: record.nis,
    nama: record.nama,
    kelas: record.kelas,
    tanggal: record.tanggal,
    jam: record.jam,
    shift: record.shift || 'Shift Reguler',
    status: record.status,
    latitude: (record.latitude !== null && record.latitude !== undefined) ? Number(record.latitude) : '',
    longitude: (record.longitude !== null && record.longitude !== undefined) ? Number(record.longitude) : '',
    accuracy: record.accuracy || '',
    jarakMeter: (record.jarakMeter !== null && record.jarakMeter !== undefined) ? Number(record.jarakMeter) : '',
    lokasiStatus: record.lokasiStatus || '',
    mapsUrl: record.mapsUrl || (record.latitude && record.longitude ? `https://www.google.com/maps?q=${record.latitude},${record.longitude}` : ''),
    qrId: record.qrId,
    timestamp: record.timestamp
  };

  sendToGoogleSheets('RECORD_ATTENDANCE', payload)
    .then((result) => {
      if (result.success) {
        console.log(`[SHEETS SYNC] Berhasil catat presensi ${record.nama} ke Spreadsheet.`);
      } else {
        console.warn(`[SHEETS SYNC WARNING] ${result.message}`);
      }
    })
    .catch((err) => {
      console.error('[SHEETS SYNC ERROR]', err);
    });
}

/**
 * Sync single student or student list to Google Sheets asynchronously
 */
export function asyncSyncMuridToSheets(murid: MuridUser | MuridUser[], plainPassword?: string) {
  if (Array.isArray(murid)) {
    sendToGoogleSheets('SYNC_MURID', murid)
      .then((result) => {
        if (result.success) {
          console.log(`[SHEETS SYNC] Berhasil simpan data murid ke Spreadsheet.`);
        }
      })
      .catch((err) => console.error('[SHEETS SYNC MURID ERROR]', err));
  } else {
    const payload = {
      ...murid,
      password: plainPassword || (murid as any).password || murid.nis
    };
    sendToGoogleSheets('ADD_MURID', payload)
      .then((result) => {
        if (result.success) {
          console.log(`[SHEETS SYNC] Berhasil simpan data murid ${murid.nama} ke Spreadsheet.`);
        }
      })
      .catch((err) => console.error('[SHEETS SYNC MURID ERROR]', err));
  }
}

/**
 * Sync admin account to Google Sheets asynchronously (dengan opsi password plain untuk kemudahan spreadsheet)
 */
export function asyncSyncAdminToSheets(admin: AdminUser, plainPassword?: string) {
  const payload = {
    ...admin,
    password: plainPassword || ''
  };
  sendToGoogleSheets('ADD_ADMIN', payload)
    .then((result) => {
      if (result.success) {
        console.log(`[SHEETS SYNC] Berhasil simpan data admin ke Spreadsheet.`);
      }
    })
    .catch((err) => console.error('[SHEETS SYNC ADMIN ERROR]', err));
}

/**
 * Sync settings to Google Sheets asynchronously
 */
export function asyncSyncSettingsToSheets(settings: SystemSettings) {
  sendToGoogleSheets('UPDATE_SETTINGS', settings)
    .then((result) => {
      if (result.success) {
        console.log(`[SHEETS SYNC] Berhasil simpan settings ke Spreadsheet.`);
      }
    })
    .catch((err) => console.error('[SHEETS SYNC SETTINGS ERROR]', err));
}
