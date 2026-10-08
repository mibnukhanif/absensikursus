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
 * Mirror attendance record to Google Sheets asynchronously
 */
export function asyncMirrorAttendanceToSheets(record: AttendanceRecord) {
  sendToGoogleSheets('RECORD_ATTENDANCE', record)
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
export function asyncSyncMuridToSheets(murid: MuridUser | MuridUser[]) {
  const action = Array.isArray(murid) ? 'SYNC_MURID' : 'ADD_MURID';
  sendToGoogleSheets(action, murid)
    .then((result) => {
      if (result.success) {
        console.log(`[SHEETS SYNC] Berhasil simpan data murid ke Spreadsheet.`);
      }
    })
    .catch((err) => console.error('[SHEETS SYNC MURID ERROR]', err));
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
