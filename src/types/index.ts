export interface AdminUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'super_admin' | 'admin';
}

export interface MuridUser {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  username: string;
  noHp?: string;
  status: 'aktif' | 'nonaktif';
  tanggalDaftar?: string;
  role: 'murid';
}

export type AuthUser = (AdminUser & { role: 'admin' }) | (MuridUser & { role: 'murid' });

export interface AttendanceRecord {
  id: string;
  muridId: string;
  nis: string;
  nama: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:mm:ss
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit';
  qrId: string;
  timestamp: number;
  createdAt: string;
}

export interface QRCodeConfig {
  id: string;
  identifier: string;
  namaLokasi: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  appName: string;
  subTitle: string;
  institutionName: string;
  institutionAddress: string;
  adminWhatsApp: string;
  adminEmail: string;
  jamMasuk: string;
  jamPulang: string;
  footerText: string;
  googleSheetsId?: string;
  googleSheetsScriptUrl?: string;
  googleSheetsSecretToken?: string;
  googleSheetsSyncEnabled?: boolean;
}

export interface DashboardSummary {
  totalMurid: number;
  hadirHariIni: number;
  belumAbsen: number;
  persentaseKehadiran: number;
  serverDate: string;
}

export interface ChartDayData {
  date: string;
  label: string;
  count: number;
}

export interface PublicInfo {
  appName: string;
  subTitle: string;
  institutionName: string;
  adminWhatsApp: string;
  footerText: string;
  hasAdmin: boolean;
}

export interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}
