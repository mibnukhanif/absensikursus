import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import {
  db,
  AdminUser,
  MuridUser,
  AttendanceRecord
} from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken,
  requireAdmin,
  requireMurid,
  getJakartaDateTime,
  bootstrapInitialAdminIfConfigured,
  AuthenticatedRequest
} from './auth.js';
import {
  asyncMirrorAttendanceToSheets,
  sendToGoogleSheets
} from './sheets.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Bootstrap admin from environment variables if set
bootstrapInitialAdminIfConfigured().catch((err) => {
  console.error('Error during initial admin bootstrap:', err);
});

// Create Router for API endpoints
const router = express.Router();

// --- PUBLIC & SETUP ENDPOINTS ---

// Check if any admin exists in the system (for initial onboarding setup)
router.get('/auth/setup-status', (_req: Request, res: Response) => {
  const admins = db.getAdmins();
  res.json({
    hasAdmin: admins.length > 0,
    systemReady: true
  });
});

// Setup Initial Admin (Only allowed when admins.length === 0)
router.post('/auth/setup-initial-admin', async (req: Request, res: Response) => {
  try {
    const admins = db.getAdmins();
    if (admins.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Setup awal sudah pernah dilakukan. Sistem telah memiliki Administrator terdaftar.'
      });
    }

    const { name, email, username, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, email, dan password wajib diisi.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal harus 8 karakter untuk keamanan production.'
      });
    }

    const passwordHash = await hashPassword(password);
    const newAdmin: AdminUser = {
      id: 'admin-' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: (username || email.split('@')[0]).trim().toLowerCase(),
      passwordHash,
      role: 'super_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.addAdmin(newAdmin);
    db.logAction(newAdmin.name, 'admin', 'Setup Awal Admin', `Akun Super Admin ${newAdmin.email} berhasil diinisialisasi.`);

    const token = generateToken({
      id: newAdmin.id,
      role: 'admin',
      identifier: newAdmin.email,
      name: newAdmin.name
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Inisialisasi Administrator berhasil!',
      token,
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        username: newAdmin.username,
        role: newAdmin.role
      }
    });
  } catch (error: any) {
    console.error('Setup initial admin error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat setup admin.' });
  }
});

// Public info
router.get('/public/info', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const admins = db.getAdmins();
  res.json({
    appName: settings.appName,
    subTitle: settings.subTitle,
    institutionName: settings.institutionName,
    adminWhatsApp: settings.adminWhatsApp,
    footerText: settings.footerText,
    hasAdmin: admins.length > 0
  });
});

// --- AUTHENTICATION ENDPOINTS ---

// Login Murid
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/NIS dan password wajib diisi.'
      });
    }

    const cleanIdentifier = identifier.trim();
    const murid = db.findMuridByUsername(cleanIdentifier) || db.findMuridByNIS(cleanIdentifier);

    if (!murid) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun Anda belum terdaftar. Silakan hubungi admin untuk melakukan pendaftaran.'
      });
    }

    if (murid.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin untuk informasi lebih lanjut.'
      });
    }

    const validPassword = await verifyPassword(password, murid.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'NIS/Username atau password salah. Silakan periksa kembali.'
      });
    }

    const token = generateToken({
      id: murid.id,
      role: 'murid',
      identifier: murid.nis,
      name: murid.nama
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: murid.id,
        nis: murid.nis,
        nama: murid.nama,
        kelas: murid.kelas,
        username: murid.username,
        noHp: murid.noHp,
        status: murid.status,
        role: 'murid'
      }
    });
  } catch (error: any) {
    console.error('Murid login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi gangguan koneksi pada server. Silakan coba lagi.' });
  }
});

// Login Admin
router.post('/auth/admin-login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username dan password wajib diisi.'
      });
    }

    const admin = db.findAdminByEmailOrUsername(identifier);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username atau password admin salah.'
      });
    }

    const validPassword = await verifyPassword(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username atau password admin salah.'
      });
    }

    const token = generateToken({
      id: admin.id,
      role: 'admin',
      identifier: admin.email,
      name: admin.name
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    db.logAction(admin.name, 'admin', 'Login Admin', `Admin ${admin.email} berhasil masuk ke dashboard.`);

    return res.json({
      success: true,
      message: 'Login Admin berhasil!',
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi gangguan koneksi pada server. Silakan coba lagi.' });
  }
});

// Logout
router.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logout berhasil.' });
});

// Get Current User Profile
router.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Tidak terotentikasi.' });
  }

  if (req.user.role === 'admin') {
    const admin = db.findAdminById(req.user.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Akun admin tidak ditemukan.' });
    return res.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: 'admin'
      }
    });
  } else {
    const murid = db.findMuridById(req.user.id);
    if (!murid || murid.isDeleted) return res.status(404).json({ success: false, message: 'Akun murid tidak ditemukan.' });
    return res.json({
      success: true,
      user: {
        id: murid.id,
        nis: murid.nis,
        nama: murid.nama,
        kelas: murid.kelas,
        username: murid.username,
        noHp: murid.noHp,
        status: murid.status,
        tanggalDaftar: murid.tanggalDaftar,
        role: 'murid'
      }
    });
  }
});

// --- MURID ENDPOINTS ---

// Murid Profile
router.get('/murid/profile', authenticateToken, requireMurid, (req: AuthenticatedRequest, res: Response) => {
  const murid = db.findMuridById(req.user!.id);
  if (!murid) {
    return res.status(404).json({ success: false, message: 'Data murid tidak ditemukan.' });
  }
  res.json({
    success: true,
    data: {
      id: murid.id,
      nis: murid.nis,
      nama: murid.nama,
      kelas: murid.kelas,
      username: murid.username,
      noHp: murid.noHp,
      status: murid.status,
      tanggalDaftar: murid.tanggalDaftar
    }
  });
});

// Change Murid Password
router.put('/murid/change-password', authenticateToken, requireMurid, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password saat ini dan password baru wajib diisi.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal harus 6 karakter.' });
    }

    const murid = db.findMuridById(req.user!.id);
    if (!murid) {
      return res.status(404).json({ success: false, message: 'Akun murid tidak ditemukan.' });
    }

    const match = await verifyPassword(currentPassword, murid.passwordHash);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Password saat ini tidak sesuai.' });
    }

    const newHash = await hashPassword(newPassword);
    db.updateMurid(murid.id, { passwordHash: newHash });

    return res.json({ success: true, message: 'Password berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui password.' });
  }
});

// --- ATTENDANCE SCAN & HISTORY ENDPOINTS ---

// Scan Attendance QR Code
router.post('/attendance/scan', authenticateToken, requireMurid, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { qrIdentifier } = req.body;

    if (!qrIdentifier) {
      return res.status(400).json({
        success: false,
        code: 'QR_MISSING',
        message: 'Identifier QR Code tidak ditemukan.'
      });
    }

    const murid = db.findMuridById(req.user!.id);
    if (!murid) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun Anda belum terdaftar. Silakan hubungi admin untuk melakukan pendaftaran.'
      });
    }

    if (murid.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda sedang nonaktif. Silakan hubungi admin.'
      });
    }

    const currentQR = db.getQRCodeConfig();

    if (currentQR.status !== 'aktif') {
      return res.status(400).json({
        success: false,
        code: 'QR_DISABLED',
        message: 'Sistem absensi QR Code sedang dinonaktifkan oleh administrator.'
      });
    }

    const trimmedScan = qrIdentifier.trim();
    if (trimmedScan !== currentQR.identifier) {
      return res.status(400).json({
        success: false,
        code: 'QR_INVALID',
        message: 'QR Code tidak dikenali. Silakan scan kembali QR Code absensi resmi Digitalmeera.'
      });
    }

    const { tanggal, jam, timestamp } = getJakartaDateTime();

    const existing = db.findAttendanceByMuridAndDate(murid.id, tanggal);
    if (existing) {
      return res.status(200).json({
        success: false,
        code: 'ALREADY_ATTENDED',
        message: 'Anda sudah melakukan absensi hari ini.',
        data: {
          id: existing.id,
          nama: existing.nama,
          nis: existing.nis,
          kelas: existing.kelas,
          tanggal: existing.tanggal,
          jam: existing.jam,
          status: existing.status
        }
      });
    }

    const settings = db.getSettings();
    let status: 'Hadir' | 'Terlambat' = 'Hadir';

    if (settings.jamMasuk) {
      const [limitH, limitM] = settings.jamMasuk.split(':').map((x) => parseInt(x, 10));
      const [currentH, currentM] = jam.split(':').map((x) => parseInt(x, 10));

      if (currentH > limitH || (currentH === limitH && currentM > limitM)) {
        status = 'Terlambat';
      }
    }

    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      muridId: murid.id,
      nis: murid.nis,
      nama: murid.nama,
      kelas: murid.kelas,
      tanggal,
      jam,
      status,
      qrId: currentQR.identifier,
      timestamp,
      createdAt: new Date().toISOString()
    };

    db.addAttendance(newRecord);

    // Asynchronous mirror to Google Spreadsheet if enabled
    asyncMirrorAttendanceToSheets(newRecord);

    return res.status(201).json({
      success: true,
      message: 'Absensi Anda berhasil dicatat.',
      data: {
        id: newRecord.id,
        nama: newRecord.nama,
        nis: newRecord.nis,
        kelas: newRecord.kelas,
        tanggal: newRecord.tanggal,
        jam: newRecord.jam,
        status: newRecord.status
      }
    });
  } catch (error: any) {
    console.error('Scan attendance error:', error);
    res.status(500).json({ success: false, message: 'Terjadi gangguan saat memproses absensi.' });
  }
});

// Murid: Get Today Attendance Status
router.get('/attendance/today', authenticateToken, requireMurid, (req: AuthenticatedRequest, res: Response) => {
  const { tanggal } = getJakartaDateTime();
  const record = db.findAttendanceByMuridAndDate(req.user!.id, tanggal);
  res.json({
    success: true,
    hasAttended: !!record,
    attendance: record || null,
    serverDate: tanggal
  });
});

// Murid: Get Personal Attendance History
router.get('/attendance/history', authenticateToken, requireMurid, (req: AuthenticatedRequest, res: Response) => {
  const muridId = req.user!.id;
  const history = db
    .getAttendance()
    .filter((a) => a.muridId === muridId)
    .sort((a, b) => b.timestamp - a.timestamp);

  res.json({
    success: true,
    data: history
  });
});

// --- ADMIN ENDPOINTS ---

// Admin Dashboard Summary
router.get('/admin/dashboard', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const allMurid = db.getMuridList();
  const activeMurid = allMurid.filter((m) => m.status === 'aktif');
  const totalMurid = activeMurid.length;

  const { tanggal } = getJakartaDateTime();
  const allAttendance = db.getAttendance();

  const todayAttendance = allAttendance.filter((a) => a.tanggal === tanggal);
  const hadirHariIni = todayAttendance.length;
  const belumAbsen = Math.max(0, totalMurid - hadirHariIni);
  const persentaseKehadiran = totalMurid > 0 ? Math.round((hadirHariIni / totalMurid) * 100) : 0;

  const chartDays: { date: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    const count = allAttendance.filter((a) => a.tanggal === dayStr).length;
    chartDays.push({ date: dayStr, label: dayLabel, count });
  }

  const recentAttendance = [...allAttendance]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  res.json({
    success: true,
    summary: {
      totalMurid,
      hadirHariIni,
      belumAbsen,
      persentaseKehadiran,
      serverDate: tanggal
    },
    chartData: chartDays,
    recentAttendance
  });
});

// Admin: Get Murid List
router.get('/admin/murid', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const kelas = (req.query.kelas as string) || '';
  const status = (req.query.status as string) || '';

  let list = db.getMuridList();

  if (search) {
    list = list.filter(
      (m) =>
        m.nama.toLowerCase().includes(search) ||
        m.nis.toLowerCase().includes(search) ||
        m.username.toLowerCase().includes(search)
    );
  }

  if (kelas) {
    list = list.filter((m) => m.kelas === kelas);
  }

  if (status) {
    list = list.filter((m) => m.status === status);
  }

  res.json({
    success: true,
    data: list.map((m) => ({
      id: m.id,
      nis: m.nis,
      nama: m.nama,
      kelas: m.kelas,
      username: m.username,
      noHp: m.noHp,
      status: m.status,
      tanggalDaftar: m.tanggalDaftar,
      createdAt: m.createdAt
    }))
  });
});

// Admin: Add Murid
router.post('/admin/murid', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nis, nama, kelas, username, noHp, password, status } = req.body;

    if (!nis || !nama || !kelas || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIS, Nama lengkap, Kelas, dan Password wajib diisi.'
      });
    }

    const cleanNIS = nis.trim();
    if (db.findMuridByNIS(cleanNIS)) {
      return res.status(400).json({
        success: false,
        message: `Murid dengan NIS "${cleanNIS}" sudah terdaftar.`
      });
    }

    const cleanUsername = (username || cleanNIS).trim().toLowerCase();
    if (db.findMuridByUsername(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" sudah digunakan oleh murid lain.`
      });
    }

    const passwordHash = await hashPassword(password);
    const { tanggal } = getJakartaDateTime();

    const newMurid: MuridUser = {
      id: 'murid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      nis: cleanNIS,
      nama: nama.trim(),
      kelas: kelas.trim(),
      username: cleanUsername,
      passwordHash,
      noHp: (noHp || '').trim(),
      status: status === 'nonaktif' ? 'nonaktif' : 'aktif',
      tanggalDaftar: tanggal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.addMurid(newMurid);
    db.logAction(req.user!.name, 'admin', 'Tambah Murid', `Menambahkan murid ${newMurid.nama} (${newMurid.nis})`);

    res.status(201).json({
      success: true,
      message: 'Data murid berhasil ditambahkan.',
      data: {
        id: newMurid.id,
        nis: newMurid.nis,
        nama: newMurid.nama,
        kelas: newMurid.kelas,
        username: newMurid.username,
        noHp: newMurid.noHp,
        status: newMurid.status
      }
    });
  } catch (err: any) {
    console.error('Error adding murid:', err);
    res.status(500).json({ success: false, message: 'Gagal menambahkan murid.' });
  }
});

// Admin: Edit Murid
router.put('/admin/murid/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nis, nama, kelas, username, noHp, status, password } = req.body;

    const existing = db.findMuridById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Murid tidak ditemukan.' });
    }

    const updates: Partial<MuridUser> = {};
    if (nama) updates.nama = nama.trim();
    if (kelas) updates.kelas = kelas.trim();
    if (noHp !== undefined) updates.noHp = noHp.trim();
    if (status && (status === 'aktif' || status === 'nonaktif')) updates.status = status;

    if (nis && nis.trim() !== existing.nis) {
      const conflict = db.findMuridByNIS(nis.trim());
      if (conflict && conflict.id !== id) {
        return res.status(400).json({ success: false, message: `NIS "${nis}" sudah digunakan murid lain.` });
      }
      updates.nis = nis.trim();
    }

    if (username && username.trim() !== existing.username) {
      const conflict = db.findMuridByUsername(username.trim());
      if (conflict && conflict.id !== id) {
        return res.status(400).json({ success: false, message: `Username "${username}" sudah digunakan murid lain.` });
      }
      updates.username = username.trim();
    }

    if (password && password.trim().length >= 6) {
      updates.passwordHash = await hashPassword(password.trim());
    }

    const updated = db.updateMurid(id, updates);
    db.logAction(req.user!.name, 'admin', 'Edit Murid', `Memperbarui data murid ${existing.nama} (${existing.nis})`);

    res.json({
      success: true,
      message: 'Data murid berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui data murid.' });
  }
});

// Admin: Delete Murid
router.delete('/admin/murid/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const murid = db.findMuridById(id);
  if (!murid) {
    return res.status(404).json({ success: false, message: 'Murid tidak ditemukan.' });
  }

  db.deleteMurid(id, true);
  db.logAction(req.user!.name, 'admin', 'Hapus Murid', `Menonaktifkan/menghapus murid ${murid.nama} (${murid.nis})`);

  res.json({
    success: true,
    message: `Data murid ${murid.nama} berhasil dihapus/dinonaktifkan.`
  });
});

// Admin: Reset Password Murid
router.post('/admin/murid/:id/reset-password', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const murid = db.findMuridById(id);
    if (!murid) {
      return res.status(404).json({ success: false, message: 'Murid tidak ditemukan.' });
    }

    const passwordHash = await hashPassword(newPassword);
    db.updateMurid(id, { passwordHash });
    db.logAction(req.user!.name, 'admin', 'Reset Password', `Mereset password untuk murid ${murid.nama} (${murid.nis})`);

    res.json({
      success: true,
      message: `Password murid ${murid.nama} berhasil direset.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mereset password murid.' });
  }
});

// Admin: Attendance Records with Filters & Search
router.get('/admin/attendance', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const tanggal = (req.query.tanggal as string) || '';
  const startDate = (req.query.startDate as string) || '';
  const endDate = (req.query.endDate as string) || '';
  const kelas = (req.query.kelas as string) || '';
  const status = (req.query.status as string) || '';
  const search = ((req.query.search as string) || '').toLowerCase().trim();

  let records = db.getAttendance();

  if (tanggal) {
    records = records.filter((r) => r.tanggal === tanggal);
  } else if (startDate || endDate) {
    if (startDate) records = records.filter((r) => r.tanggal >= startDate);
    if (endDate) records = records.filter((r) => r.tanggal <= endDate);
  }

  if (kelas) {
    records = records.filter((r) => r.kelas === kelas);
  }

  if (status) {
    records = records.filter((r) => r.status === status);
  }

  if (search) {
    records = records.filter(
      (r) =>
        r.nama.toLowerCase().includes(search) ||
        r.nis.toLowerCase().includes(search) ||
        r.kelas.toLowerCase().includes(search)
    );
  }

  records.sort((a, b) => b.timestamp - a.timestamp);

  res.json({
    success: true,
    total: records.length,
    data: records
  });
});

// Admin: Get Static QR Code
router.get('/admin/qrcode', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const qr = db.getQRCodeConfig();
  res.json({
    success: true,
    data: qr
  });
});

// Admin: Update Static QR Code
router.put('/admin/qrcode', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { identifier, namaLokasi, status } = req.body;

  const updates: any = {};
  if (identifier && identifier.trim()) updates.identifier = identifier.trim().toUpperCase();
  if (namaLokasi) updates.namaLokasi = namaLokasi.trim();
  if (status && (status === 'aktif' || status === 'nonaktif')) updates.status = status;

  const updated = db.updateQRCodeConfig(updates);
  db.logAction(
    req.user!.name,
    'admin',
    'Update QR Code',
    `Memperbarui konfigurasi QR Code: ${updated.identifier} (${updated.status})`
  );

  res.json({
    success: true,
    message: 'Konfigurasi QR Code berhasil diperbarui.',
    data: updated
  });
});

// Admin: Get System Settings
router.get('/admin/settings', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    data: settings
  });
});

// Admin: Update System Settings
router.put('/admin/settings', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const {
    appName,
    subTitle,
    institutionName,
    institutionAddress,
    adminWhatsApp,
    adminEmail,
    jamMasuk,
    jamPulang,
    footerText,
    googleSheetsId,
    googleSheetsScriptUrl,
    googleSheetsSecretToken,
    googleSheetsSyncEnabled
  } = req.body;

  const updates: any = {};
  if (appName) updates.appName = appName.trim();
  if (subTitle) updates.subTitle = subTitle.trim();
  if (institutionName) updates.institutionName = institutionName.trim();
  if (institutionAddress) updates.institutionAddress = institutionAddress.trim();
  if (adminWhatsApp) updates.adminWhatsApp = adminWhatsApp.trim();
  if (adminEmail) updates.adminEmail = adminEmail.trim();
  if (jamMasuk) updates.jamMasuk = jamMasuk.trim();
  if (jamPulang) updates.jamPulang = jamPulang.trim();
  if (footerText) updates.footerText = footerText.trim();
  if (googleSheetsId !== undefined) updates.googleSheetsId = googleSheetsId.trim();
  if (googleSheetsScriptUrl !== undefined) updates.googleSheetsScriptUrl = googleSheetsScriptUrl.trim();
  if (googleSheetsSecretToken !== undefined) updates.googleSheetsSecretToken = googleSheetsSecretToken.trim();
  if (googleSheetsSyncEnabled !== undefined) updates.googleSheetsSyncEnabled = !!googleSheetsSyncEnabled;

  const updated = db.updateSettings(updates);
  db.logAction(req.user!.name, 'admin', 'Update Pengaturan', 'Memperbarui pengaturan sistem dan lembaga.');

  res.json({
    success: true,
    message: 'Pengaturan sistem berhasil disimpan.',
    data: updated
  });
});

// Admin: Test Google Apps Script Webhook Connection
router.post('/admin/sheets/test', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await sendToGoogleSheets('PING', {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menguji koneksi: ' + err.message });
  }
});

// Admin: Full Sync to Google Spreadsheet
router.post('/admin/sheets/sync-all', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const murid = db.getMuridList();
    const attendance = db.getAttendance();
    const admins = db.getAdmins();
    const settings = db.getSettings();

    const result = await sendToGoogleSheets('SYNC_ALL', {
      murid,
      attendance,
      admins,
      settings
    });

    if (result.success) {
      db.logAction(req.user!.name, 'admin', 'Sync Google Sheets', 'Melakukan sinkronisasi penuh ke Google Spreadsheet.');
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal sinkronisasi data: ' + err.message });
  }
});

// Admin: Get Audit Logs
router.get('/admin/audit-logs', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const logs = db.getAuditLogs();
  res.json({
    success: true,
    data: logs
  });
});

// Admin: Export CSV Attendance
router.get('/admin/export-csv', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const tanggal = (req.query.tanggal as string) || '';
  const startDate = (req.query.startDate as string) || '';
  const endDate = (req.query.endDate as string) || '';
  const kelas = (req.query.kelas as string) || '';

  let records = db.getAttendance();
  if (tanggal) records = records.filter((r) => r.tanggal === tanggal);
  else if (startDate || endDate) {
    if (startDate) records = records.filter((r) => r.tanggal >= startDate);
    if (endDate) records = records.filter((r) => r.tanggal <= endDate);
  }
  if (kelas) records = records.filter((r) => r.kelas === kelas);

  records.sort((a, b) => b.timestamp - a.timestamp);

  const headers = ['No', 'ID Absensi', 'NIS', 'Nama Murid', 'Kelas', 'Tanggal', 'Jam', 'Status', 'QR Token'];
  const rows = records.map((r, i) => [
    i + 1,
    `"${r.id}"`,
    `"${r.nis}"`,
    `"${r.nama.replace(/"/g, '""')}"`,
    `"${r.kelas}"`,
    `"${r.tanggal}"`,
    `"${r.jam}"`,
    `"${r.status}"`,
    `"${r.qrId}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="absensi_digitalmeera_${Date.now()}.csv"`);
  res.send(csvContent);
});

// Mount router on BOTH '/api' and '/'
// This guarantees that whether Vercel rewrites preserve '/api' or strip it, requests always match!
app.use('/api', router);
app.use('/', router);

export { app };
export default app;
