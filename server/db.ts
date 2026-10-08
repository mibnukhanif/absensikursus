import fs from 'fs';
import path from 'path';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  role: 'super_admin' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface MuridUser {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  username: string;
  passwordHash: string;
  noHp: string;
  status: 'aktif' | 'nonaktif';
  fotoUrl?: string;
  tanggalDaftar: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface PresensiShift {
  id: string;
  nama: string;
  jamMasuk: string;
  jamPulang: string;
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
  keterangan?: string;
}

export interface QRCodeConfig {
  id: string;
  identifier: string; // e.g. "DIGITALMEERA-ABSENSI-001"
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
  jamMasuk: string; // e.g. "07:30"
  jamPulang: string; // e.g. "15:00"
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
  updatedAt: string;
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

interface DatabaseSchema {
  admins: AdminUser[];
  murid: MuridUser[];
  attendance: AttendanceRecord[];
  qrCode: QRCodeConfig;
  settings: SystemSettings;
  auditLogs: AuditLog[];
}

const isVercel = !!process.env.VERCEL;
const DB_DIR = isVercel
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'db.json');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'db.json');

export const DEFAULT_SHIFTS: PresensiShift[] = [
  {
    id: 'shift-pagi',
    nama: 'Shift Pagi / Reguler',
    jamMasuk: '07:30',
    jamPulang: '15:00',
    toleransiMenit: 0,
    aktif: true
  },
  {
    id: 'shift-siang',
    nama: 'Shift Siang',
    jamMasuk: '12:30',
    jamPulang: '17:30',
    toleransiMenit: 0,
    aktif: true
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'DIGITALMEERA ABSENSI',
  subTitle: 'Sistem Absensi Digital Berbasis QR Code',
  institutionName: 'Lembaga Pendidikan Digitalmeera',
  institutionAddress: 'Jl. Merdeka Digital No. 88, Indonesia',
  adminWhatsApp: '081234567890',
  adminEmail: 'admin@digitalmeera.edu',
  jamMasuk: '07:30',
  jamPulang: '15:00',
  shifts: DEFAULT_SHIFTS,
  targetLatitude: -6.200000,
  targetLongitude: 106.816666,
  radiusMeters: 100,
  enforceLocation: false,
  footerText: '© 2026 DIGITALMEERA. Hak Cipta Dilindungi.',
  googleSheetsId: '1Mv6cw3CrjCVW7o42lM87iN98D0i0p4ClaCCHrg9i1Ek',
  googleSheetsScriptUrl: 'https://script.google.com/macros/s/AKfycbybSkJPMQvRtFQFLhKyb76R1mxWPxM6N5kuhV4oGAhhQMuyQAogLtV8TJrRiCQbURQI/exec',
  googleSheetsSecretToken: '',
  googleSheetsSyncEnabled: true,
  updatedAt: new Date().toISOString()
};

const DEFAULT_QR_CONFIG: QRCodeConfig = {
  id: 'qr-primary-1',
  identifier: 'DIGITALMEERA-ABSENSI-001',
  namaLokasi: 'Pintu Masuk Utama Kampus Digitalmeera',
  status: 'aktif',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const DEFAULT_PRIMARY_ADMIN: AdminUser = {
  id: 'admin-primary',
  email: 'digitalmeera.com@gmail.com',
  username: 'admin',
  name: 'Administrator Utama',
  passwordHash: '$2b$10$MXa2bk6vjixer0JXozxz7um3PV03nD3ehd0uV5m/1mlZFnKf6JUEO', // admin12345
  role: 'super_admin',
  createdAt: '2026-10-08T00:00:00.000Z',
  updatedAt: '2026-10-08T00:00:00.000Z'
};

const DEFAULT_SAMPLE_MURID: MuridUser[] = [
  {
    id: 'murid-1001',
    nis: '1001',
    nama: 'Ahmad Fauzi',
    kelas: 'XII IPA 1',
    username: '1001',
    passwordHash: '$2b$10$2/3IgDo94S1R3guFtCJKC.q.CK/n3fAO/oM67LRCxvU/nfiKaIVsC', // 1001
    noHp: '081234567891',
    status: 'aktif',
    tanggalDaftar: '2026-10-08',
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z'
  },
  {
    id: 'murid-1002',
    nis: '1002',
    nama: 'Siti Rahmawati',
    kelas: 'XII IPA 1',
    username: '1002',
    passwordHash: '$2b$10$Pu.jr/fn5.2m.EWh65j2dODw.iVWy0RbzvOTPd9OuLKHn5Cb2gBzS', // 1002
    noHp: '081234567892',
    status: 'aktif',
    tanggalDaftar: '2026-10-08',
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z'
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (isVercel && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
        try {
          fs.copyFileSync(SEED_FILE, DB_FILE);
        } catch (copyErr) {
          console.warn('Could not copy seed DB to /tmp:', copyErr);
        }
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const admins = (parsed.admins && parsed.admins.length > 0) ? parsed.admins : [DEFAULT_PRIMARY_ADMIN];
        const murid = (parsed.murid && parsed.murid.length > 0) ? parsed.murid : DEFAULT_SAMPLE_MURID;

        const loadedSettings: SystemSettings = {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
          shifts: (parsed.settings && parsed.settings.shifts && parsed.settings.shifts.length > 0)
            ? parsed.settings.shifts
            : DEFAULT_SHIFTS
        };

        return {
          admins,
          murid,
          attendance: parsed.attendance || [],
          qrCode: parsed.qrCode || DEFAULT_QR_CONFIG,
          settings: loadedSettings,
          auditLogs: parsed.auditLogs || []
        };
      }
    } catch (err) {
      console.error('Error loading database file, initializing empty schema:', err);
    }

    const initial: DatabaseSchema = {
      admins: [DEFAULT_PRIMARY_ADMIN],
      murid: DEFAULT_SAMPLE_MURID,
      attendance: [],
      qrCode: DEFAULT_QR_CONFIG,
      settings: DEFAULT_SETTINGS,
      auditLogs: []
    };
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- Admin Queries ---
  public getAdmins(): AdminUser[] {
    return this.data.admins;
  }

  public findAdminById(id: string): AdminUser | undefined {
    return this.data.admins.find((a) => a.id === id);
  }

  public findAdminByEmailOrUsername(identifier: string): AdminUser | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.admins.find(
      (a) => a.email.toLowerCase() === clean || a.username.toLowerCase() === clean
    );
  }

  public addAdmin(admin: AdminUser) {
    this.data.admins.push(admin);
    this.save();
  }

  public updateAdmin(id: string, updates: Partial<AdminUser>): AdminUser | null {
    const idx = this.data.admins.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.admins[idx] = { ...this.data.admins[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.admins[idx];
  }

  // --- Murid Queries ---
  public getMuridList(includeDeleted = false): MuridUser[] {
    if (includeDeleted) return this.data.murid;
    return this.data.murid.filter((m) => !m.isDeleted);
  }

  public findMuridById(id: string): MuridUser | undefined {
    return this.data.murid.find((m) => m.id === id && !m.isDeleted);
  }

  public findMuridByNIS(nis: string): MuridUser | undefined {
    const clean = nis.trim().toUpperCase();
    return this.data.murid.find((m) => m.nis.trim().toUpperCase() === clean && !m.isDeleted);
  }

  public findMuridByUsername(username: string): MuridUser | undefined {
    const clean = username.trim().toLowerCase();
    return this.data.murid.find(
      (m) => (m.username.toLowerCase() === clean || m.nis.toLowerCase() === clean) && !m.isDeleted
    );
  }

  public addMurid(murid: MuridUser) {
    this.data.murid.push(murid);
    this.save();
  }

  public updateMurid(id: string, updates: Partial<MuridUser>): MuridUser | null {
    const idx = this.data.murid.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    this.data.murid[idx] = { ...this.data.murid[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.murid[idx];
  }

  public deleteMurid(id: string, soft = true): boolean {
    const idx = this.data.murid.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    if (soft) {
      this.data.murid[idx].isDeleted = true;
      this.data.murid[idx].updatedAt = new Date().toISOString();
    } else {
      this.data.murid.splice(idx, 1);
    }
    this.save();
    return true;
  }

  // --- Attendance Queries ---
  public getAttendance(): AttendanceRecord[] {
    return this.data.attendance;
  }

  public findAttendanceByMuridAndDate(muridId: string, tanggal: string): AttendanceRecord | undefined {
    return this.data.attendance.find((a) => a.muridId === muridId && a.tanggal === tanggal);
  }

  public addAttendance(record: AttendanceRecord) {
    this.data.attendance.push(record);
    this.save();
  }

  // --- QR Code Queries ---
  public getQRCodeConfig(): QRCodeConfig {
    return this.data.qrCode;
  }

  public updateQRCodeConfig(updates: Partial<QRCodeConfig>): QRCodeConfig {
    this.data.qrCode = { ...this.data.qrCode, ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.qrCode;
  }

  // --- Settings Queries ---
  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.settings;
  }

  // --- Audit Logs ---
  public logAction(actor: string, role: string, action: string, details: string) {
    const entry: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      actor,
      role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(entry);
    // keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }
}

export const db = new Database();
