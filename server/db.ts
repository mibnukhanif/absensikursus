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
  institutionName: string;
  institutionAddress: string;
  adminWhatsApp: string;
  adminEmail: string;
  jamMasuk: string; // e.g. "07:30"
  jamPulang: string; // e.g. "15:00"
  footerText: string;
  googleSheetsId?: string;
  googleSheetsScriptUrl?: string;
  googleSheetsSecretToken?: string;
  googleSheetsSyncEnabled?: boolean;
  updatedAt: string;
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

const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'DIGITALMEERA ABSENSI',
  subTitle: 'Sistem Absensi Digital Berbasis QR Code',
  institutionName: 'Lembaga Pendidikan Digitalmeera',
  institutionAddress: 'Jl. Merdeka Digital No. 88, Indonesia',
  adminWhatsApp: '081234567890',
  adminEmail: 'admin@digitalmeera.edu',
  jamMasuk: '07:30',
  jamPulang: '15:00',
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
        return {
          admins: parsed.admins || [],
          murid: parsed.murid || [],
          attendance: parsed.attendance || [],
          qrCode: parsed.qrCode || DEFAULT_QR_CONFIG,
          settings: parsed.settings || DEFAULT_SETTINGS,
          auditLogs: parsed.auditLogs || []
        };
      }
    } catch (err) {
      console.error('Error loading database file, initializing empty schema:', err);
    }

    const initial: DatabaseSchema = {
      admins: [],
      murid: [],
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
