import { AttendanceRecord, db } from './db.js';

export async function sendToGoogleSheets(action: string, payload: any): Promise<{ success: boolean; message: string; data?: any }> {
  const settings = db.getSettings();

  if (!settings.googleSheetsSyncEnabled || !settings.googleSheetsScriptUrl) {
    return { success: false, message: 'Google Sheets sync belum diaktifkan atau URL script belum diisi.' };
  }

  try {
    const res = await fetch(settings.googleSheetsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        token: settings.googleSheetsSecretToken || '',
        data: payload
      })
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, message: data.message || `Gagal menghubungi Google Apps Script (${res.status})` };
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
 * Mirror attendance record to Google Sheets asynchronously
 */
export function asyncMirrorAttendanceToSheets(record: AttendanceRecord) {
  const settings = db.getSettings();
  if (!settings.googleSheetsSyncEnabled || !settings.googleSheetsScriptUrl) {
    return;
  }

  // Fire and forget, does not block client response
  sendToGoogleSheets('RECORD_ATTENDANCE', record)
    .then((result) => {
      if (result.success) {
        console.log(`[SHEETS SYNC] Successfully synced attendance for ${record.nama} (${record.nis})`);
      } else {
        console.warn(`[SHEETS SYNC WARNING] ${result.message}`);
      }
    })
    .catch((err) => {
      console.error('[SHEETS SYNC ERROR]', err);
    });
}
