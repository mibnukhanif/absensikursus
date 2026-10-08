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

export interface PresensiShift {
  id: string;
  nama: string;         // e.g. "Shift Pagi / Reguler", "Shift Siang"
  jamMasuk: string;     // e.g. "07:30"
  jamPulang: string;    // e.g. "15:00"
  toleransiMenit?: number;
  aktif: boolean;
}

export interface AttendanceRecord {
  id: string;
  muridId: string;
  nis: string;
  nama: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:mm:ss
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit';
  shift?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  jarakMeter?: number | null;
  lokasiStatus?: 'Sesuai Radius' | 'Luar Radius' | 'Lokasi Tidak Terdeteksi';
  mapsUrl?: string;
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
  appLogo?: string;
  institutionName: string;
  institutionAddress: string;
  adminWhatsApp: string;
  adminEmail: string;
  jamMasuk: string;
  jamPulang: string;
  shifts: PresensiShift[];
  targetLatitude: number;
  targetLongitude: number;
  radiusMeters: number;
  enforceLocation: boolean;
  footerText: string;
  googleSheetsId?: string;
  googleSheetsScriptUrl?: string;
  googleSheetsSecretToken?: string;
  googleSheetsSyncEnabled?: boolean;
  updatedAt?: string;
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
  appLogo?: string;
  institutionName: string;
  adminWhatsApp: string;
  footerText: string;
  hasAdmin: boolean;
  shifts?: PresensiShift[];
  targetLatitude?: number;
  targetLongitude?: number;
  radiusMeters?: number;
  enforceLocation?: boolean;
}

export interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}
