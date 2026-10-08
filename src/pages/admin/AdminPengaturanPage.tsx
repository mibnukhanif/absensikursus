import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import { SystemSettings, AuditLog } from '../../types/index.js';
import {
  Settings,
  Building,
  Clock,
  Phone,
  Mail,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  ShieldCheck,
  User,
  Key,
  Lock,
  History,
  AlertCircle,
  Info
} from 'lucide-react';

export const AdminPengaturanPage: React.FC = () => {
  const { refreshProfile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    appName: '',
    subTitle: '',
    institutionName: '',
    institutionAddress: '',
    adminWhatsApp: '',
    adminEmail: '',
    jamMasuk: '07:30',
    jamPulang: '15:00',
    footerText: '',
    googleSheetsId: '',
    googleSheetsScriptUrl: '',
    googleSheetsSecretToken: '',
    googleSheetsSyncEnabled: false
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin Account & Username state
  const [adminProfile, setAdminProfile] = useState({
    name: '',
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSet, resLogs, resProf] = await Promise.all([
        apiRequest<SystemSettings>('/api/admin/settings'),
        apiRequest<AuditLog[]>('/api/admin/audit-logs'),
        apiRequest<any>('/api/admin/profile')
      ]);

      if (resSet.success && resSet.data) {
        setSettings(resSet.data);
      }
      if (resLogs.success && resLogs.data) {
        setLogs(resLogs.data);
      }
      if (resProf.success && resProf.data) {
        setAdminProfile((prev) => ({
          ...prev,
          name: resProf.data.name || '',
          email: resProf.data.email || '',
          username: resProf.data.username || ''
        }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const res = await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });

    setSaving(false);

    if (res.success && res.data) {
      setSettings(res.data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      fetchData();
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSuccessMsg(null);
    setAdminErrorMsg(null);

    if (!adminProfile.name.trim() || !adminProfile.email.trim() || !adminProfile.username.trim()) {
      setAdminErrorMsg('Nama lengkap, email, dan username admin wajib diisi.');
      return;
    }

    if (adminProfile.newPassword) {
      if (!adminProfile.currentPassword) {
        setAdminErrorMsg('Kata sandi saat ini wajib diisi untuk mengubah kata sandi.');
        return;
      }
      if (adminProfile.newPassword.length < 8) {
        setAdminErrorMsg('Kata sandi baru minimal harus 8 karakter.');
        return;
      }
      if (adminProfile.newPassword !== adminProfile.confirmPassword) {
        setAdminErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
    }

    setSavingAdmin(true);

    const res = await apiRequest('/api/admin/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: adminProfile.name.trim(),
        email: adminProfile.email.trim(),
        username: adminProfile.username.trim(),
        currentPassword: adminProfile.currentPassword,
        newPassword: adminProfile.newPassword
      })
    });

    setSavingAdmin(false);

    if (res.success) {
      setAdminSuccessMsg('Akun & username admin berhasil disimpan dan disinkronkan ke tab ADMIN di Google Spreadsheet!');
      setAdminProfile((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      refreshProfile();
      fetchData();
      setTimeout(() => setAdminSuccessMsg(null), 5000);
    } else {
      setAdminErrorMsg(res.message || 'Gagal memperbarui profil admin.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Preferensi Sistem</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Pengaturan & Informasi Lembaga</h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi identitas lembaga, jam operasional presensi, dan integrasi spreadsheet
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Pengaturan sistem berhasil disimpan dan diperbarui di database.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin Profile & Credentials Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Profil & Akun Administrator
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono text-[10px] border border-indigo-800">
                Tersinkron ke Tab ADMIN
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Ubah <strong>Username</strong>, <strong>Nama</strong>, atau <strong>Password</strong> akun admin. Perubahan akan otomatis tersimpan di sistem dan disinkronkan langsung ke tab <code>ADMIN</code> di Google Spreadsheet.
            </p>

            {adminSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adminSuccessMsg}</span>
              </div>
            )}

            {adminErrorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Username Login Admin *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={adminProfile.username}
                      onChange={(e) => setAdminProfile({ ...adminProfile, username: e.target.value })}
                      placeholder="Contoh: admin atau digitalmeera"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Username ini dapat langsung digunakan untuk login admin.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Nama Lengkap Admin *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.name}
                    onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                    placeholder="Nama Admin"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Email Resmi Admin *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={adminProfile.email}
                    onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                    placeholder="admin@digitalmeera.edu"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Ubah Password Admin (Kosongkan jika tidak ingin mengubah)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Password Saat Ini</label>
                    <input
                      type="password"
                      value={adminProfile.currentPassword}
                      onChange={(e) => setAdminProfile({ ...adminProfile, currentPassword: e.target.value })}
                      placeholder="Password lama"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Password Baru</label>
                    <input
                      type="password"
                      value={adminProfile.newPassword}
                      onChange={(e) => setAdminProfile({ ...adminProfile, newPassword: e.target.value })}
                      placeholder="Min. 8 karakter"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Konfirmasi Password</label>
                    <input
                      type="password"
                      value={adminProfile.confirmPassword}
                      onChange={(e) => setAdminProfile({ ...adminProfile, confirmPassword: e.target.value })}
                      placeholder="Ulangi password"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingAdmin}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-md shadow-indigo-950/40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingAdmin ? 'Menyimpan...' : 'Simpan Akun Admin & Sinkronkan ke Spreadsheet'}</span>
              </button>
            </form>
          </div>

          {/* Main Settings Form */}
          <form onSubmit={handleSave} className="space-y-6">
          {/* General App Info */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" /> Identitas Aplikasi & Lembaga
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Aplikasi</label>
                <input
                  type="text"
                  required
                  value={settings.appName}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subjudul / Deskripsi</label>
                <input
                  type="text"
                  required
                  value={settings.subTitle}
                  onChange={(e) => setSettings({ ...settings, subTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Nama Lembaga / Sekolah</label>
              <input
                type="text"
                required
                value={settings.institutionName}
                onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Alamat Lembaga</label>
              <input
                type="text"
                value={settings.institutionAddress}
                onChange={(e) => setSettings({ ...settings, institutionAddress: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">No. WhatsApp Admin (Bantuan)</label>
                <input
                  type="text"
                  value={settings.adminWhatsApp}
                  onChange={(e) => setSettings({ ...settings, adminWhatsApp: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email Resmi Admin</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  placeholder="admin@digitalmeera.edu"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Operational Hours */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Jam Batas Presensi
            </h3>
            <p className="text-slate-400 text-[11px]">
              Murid yang melakukan scan melebihi jam masuk akan otomatis berstatus <strong>Terlambat</strong>.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Batas Jam Masuk (HH:mm)</label>
                <input
                  type="time"
                  required
                  value={settings.jamMasuk}
                  onChange={(e) => setSettings({ ...settings, jamMasuk: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Jam Pulang (HH:mm)</label>
                <input
                  type="time"
                  value={settings.jamPulang}
                  onChange={(e) => setSettings({ ...settings, jamPulang: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Google Spreadsheet Mirroring Configuration */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Integrasi Google Spreadsheet (Code.gs)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px] border border-emerald-800">
                Webhook Apps Script
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Sambungkan Google Spreadsheet menggunakan script <code>google-apps-script/Code.gs</code>. Data kehadiran otomatis disalin ke tab: <code>ABSENSI</code>, <code>MURID</code>, <code>ADMIN</code>, dan <code>SETTINGS</code>.
            </p>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Google Apps Script Web App URL *
              </label>
              <input
                type="url"
                value={settings.googleSheetsScriptUrl || ''}
                onChange={(e) => setSettings({ ...settings, googleSheetsScriptUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Diperoleh setelah deploy script <code>Code.gs</code> sebagai Web App (akses: Anyone).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Secret Token Apps Script
                </label>
                <input
                  type="text"
                  value={settings.googleSheetsSecretToken || ''}
                  onChange={(e) => setSettings({ ...settings, googleSheetsSecretToken: e.target.value })}
                  placeholder="DIGITALMEERA_SECRET_SHEET_KEY"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Google Spreadsheet ID (Opsional)</label>
                <input
                  type="text"
                  value={settings.googleSheetsId || ''}
                  onChange={(e) => setSettings({ ...settings, googleSheetsId: e.target.value })}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUq..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="syncSheet"
                checked={!!settings.googleSheetsSyncEnabled}
                onChange={(e) => setSettings({ ...settings, googleSheetsSyncEnabled: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="syncSheet" className="text-slate-200 font-medium">
                Aktifkan pencatatan otomatis real-time ke Google Spreadsheet saat murid scan QR
              </label>
            </div>

            {/* Test & Manual Sync Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  if (!settings.googleSheetsScriptUrl) {
                    alert('Harap isi URL Web App Google Apps Script terlebih dahulu.');
                    return;
                  }
                  try {
                    const res = await apiRequest('/api/admin/sheets/test', { method: 'POST' });
                    alert(res.message || (res.success ? 'Koneksi Berhasil!' : 'Gagal menghubungkan.'));
                  } catch (e: any) {
                    alert('Terjadi kesalahan: ' + e.message);
                  }
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Uji Koneksi Script
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!settings.googleSheetsScriptUrl) {
                    alert('Harap isi URL Web App Google Apps Script terlebih dahulu.');
                    return;
                  }
                  try {
                    const res = await apiRequest('/api/admin/sheets/sync-all', { method: 'POST' });
                    alert(res.message || 'Sinkronisasi selesai.');
                  } catch (e: any) {
                    alert('Terjadi kesalahan: ' + e.message);
                  }
                }}
                className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Sinkronkan Seluruh Data Sekarang
              </button>
            </div>
          </div>

          {/* Footer Text */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <label className="block text-slate-400 font-semibold mb-1">Teks Footer Website</label>
            <input
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-950/40"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </form>
        </div>

        {/* Sidebar: Audit Logs & Security Info */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" /> Log Aktivitas Admin
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Jejak audit seluruh perubahan data murid, pengaturan, dan absensi
            </p>

            {logs.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 text-center text-slate-500 text-xs">
                Belum ada aktivitas tercatat.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="font-semibold text-emerald-400">{log.action}</span>
                      <span className="text-[10px] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{log.details}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">Oleh: {log.actor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
