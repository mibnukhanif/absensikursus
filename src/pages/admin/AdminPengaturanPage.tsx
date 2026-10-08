import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import { SystemSettings, AuditLog, PresensiShift } from '../../types/index.js';
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
  Info,
  Download,
  MapPin,
  Layers,
  Plus,
  Trash2,
  Crosshair,
  ExternalLink,
  Edit2,
  Image,
  Upload,
  X
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
    shifts: [],
    targetLatitude: -6.200000,
    targetLongitude: 106.816666,
    radiusMeters: 100,
    enforceLocation: false,
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

  // New & Editing Shift state
  const [newShift, setNewShift] = useState({
    nama: '',
    jamMasuk: '07:30',
    jamPulang: '15:00',
    toleransiMenit: 0
  });
  const [editingShift, setEditingShift] = useState<PresensiShift | null>(null);
  const [showAddShift, setShowAddShift] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Logo file upload handler
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSettings((prev) => ({ ...prev, appLogo: result }));
      }
    };
    reader.readAsDataURL(file);
  };

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

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.nama.trim()) return;
    const shiftItem = {
      id: 'shift-' + Date.now(),
      nama: newShift.nama.trim(),
      jamMasuk: newShift.jamMasuk,
      jamPulang: newShift.jamPulang,
      toleransiMenit: Number(newShift.toleransiMenit) || 0,
      aktif: true
    };
    setSettings((prev) => ({
      ...prev,
      shifts: [...(prev.shifts || []), shiftItem]
    }));
    setNewShift({ nama: '', jamMasuk: '07:30', jamPulang: '15:00', toleransiMenit: 0 });
    setShowAddShift(false);
  };

  const handleUpdateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift || !editingShift.nama.trim()) return;
    setSettings((prev) => ({
      ...prev,
      shifts: (prev.shifts || []).map((s) =>
        s.id === editingShift.id
          ? {
              ...editingShift,
              nama: editingShift.nama.trim(),
              toleransiMenit: Number(editingShift.toleransiMenit) || 0
            }
          : s
      )
    }));
    setEditingShift(null);
  };

  const handleRemoveShift = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      shifts: (prev.shifts || []).filter((s) => s.id !== id)
    }));
  };

  const handleToggleShift = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      shifts: (prev.shifts || []).map((s) => (s.id === id ? { ...s, aktif: !s.aktif } : s))
    }));
  };

  const handleGetCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Browser Anda tidak mendukung deteksi lokasi.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((prev) => ({
          ...prev,
          targetLatitude: Number(pos.coords.latitude.toFixed(6)),
          targetLongitude: Number(pos.coords.longitude.toFixed(6))
        }));
        setGettingLocation(false);
        alert(`Titik Koordinat Berhasil Diperoleh!\nLatitude: ${pos.coords.latitude.toFixed(6)}\nLongitude: ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setGettingLocation(false);
        alert('Gagal mendeteksi lokasi GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

            {/* Pengaturan Logo Aplikasi */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-emerald-400" /> Logo Aplikasi
                </span>
                {settings.appLogo && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, appLogo: '' })}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-normal flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Reset ke Logo Default
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Logo Preview Box */}
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-1.5 shrink-0 shadow-inner">
                  {settings.appLogo ? (
                    <img
                      src={settings.appLogo}
                      alt="Logo Aplikasi"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                      Default
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">Mendukung PNG, JPG, SVG, WEBP (Maks. 2MB)</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={settings.appLogo || ''}
                      onChange={(e) => setSettings({ ...settings, appLogo: e.target.value })}
                      placeholder="Atau tempel URL gambar logo (https://...)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
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

          {/* Shift Jam Batas Presensi */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Jam Batas Presensi & Shift
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Kelola jadwal shift presensi. Murid yang scan melewati jam masuk akan berstatus <strong>Terlambat</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddShift(!showAddShift)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Shift
              </button>
            </div>

            {/* Shift List Table */}
            <div className="space-y-2">
              {(settings.shifts || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 text-center">
                  Belum ada shift presensi khusus. Menggunakan jam masuk default ({settings.jamMasuk} - {settings.jamPulang}).
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                  {(settings.shifts || []).map((sh) => (
                    <div key={sh.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{sh.nama}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sh.aktif ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                            {sh.aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Masuk: <span className="text-emerald-400">{sh.jamMasuk}</span> • Pulang: <span className="text-blue-400">{sh.jamPulang}</span> • Toleransi: {sh.toleransiMenit || 0} menit
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingShift(sh)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 flex items-center gap-1 transition cursor-pointer"
                          title="Edit Shift"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleShift(sh.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            sh.aktif
                              ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                              : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                          }`}
                        >
                          {sh.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveShift(sh.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          title="Hapus Shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Edit Shift yang Dipilih */}
            {editingShift && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-emerald-400" /> Edit Shift: <span className="text-emerald-300">{editingShift.nama}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingShift(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Nama Shift *</label>
                    <input
                      type="text"
                      required
                      value={editingShift.nama}
                      onChange={(e) => setEditingShift({ ...editingShift, nama: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Batas Jam Masuk (HH:mm) *</label>
                    <input
                      type="time"
                      required
                      value={editingShift.jamMasuk}
                      onChange={(e) => setEditingShift({ ...editingShift, jamMasuk: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Jam Pulang (HH:mm) *</label>
                    <input
                      type="time"
                      required
                      value={editingShift.jamPulang}
                      onChange={(e) => setEditingShift({ ...editingShift, jamPulang: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Toleransi Terlambat (Menit)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingShift.toleransiMenit ?? 0}
                      onChange={(e) => setEditingShift({ ...editingShift, toleransiMenit: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={editingShift.aktif}
                      onChange={(e) => setEditingShift({ ...editingShift, aktif: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Status Shift Aktif</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingShift(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateShift}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                    >
                      Simpan Perubahan Shift
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Tambah Shift Baru */}
            {showAddShift && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-900/50 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" /> Tambah Shift Presensi Baru
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Nama Shift *</label>
                    <input
                      type="text"
                      value={newShift.nama}
                      onChange={(e) => setNewShift({ ...newShift, nama: e.target.value })}
                      placeholder="Contoh: Shift Siang / Khusus"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Batas Jam Masuk (HH:mm) *</label>
                    <input
                      type="time"
                      value={newShift.jamMasuk}
                      onChange={(e) => setNewShift({ ...newShift, jamMasuk: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Jam Pulang (HH:mm) *</label>
                    <input
                      type="time"
                      value={newShift.jamPulang}
                      onChange={(e) => setNewShift({ ...newShift, jamPulang: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Toleransi Terlambat (Menit)</label>
                    <input
                      type="number"
                      min="0"
                      value={newShift.toleransiMenit}
                      onChange={(e) => setNewShift({ ...newShift, toleransiMenit: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddShift(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleAddShift}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Simpan Shift
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Titik Koordinat Maps & Geofencing Sekolah */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" /> Titik Koordinat Lokasi & Geofencing Maps
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Tentukan titik pusat sekolah agar murid wajib berada di lokasi saat melakukan scan absensi.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                {gettingLocation ? 'Mendeteksi...' : 'Ambil Titik GPS Saya'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Target Latitude (Garis Lintang)
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings.targetLatitude ?? -6.200000}
                  onChange={(e) => setSettings({ ...settings, targetLatitude: parseFloat(e.target.value) || 0 })}
                  placeholder="-6.200000"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Target Longitude (Garis Bujur)
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings.targetLongitude ?? 106.816666}
                  onChange={(e) => setSettings({ ...settings, targetLongitude: parseFloat(e.target.value) || 0 })}
                  placeholder="106.816666"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Radius Izin Presensi Maksimal (Meter)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={settings.radiusMeters || 100}
                    onChange={(e) => setSettings({ ...settings, radiusMeters: parseInt(e.target.value, 10) || 100 })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="self-center font-bold text-slate-400">Meter</span>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <a
                  href={`https://www.google.com/maps?q=${settings.targetLatitude || -6.2},${settings.targetLongitude || 106.816}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-blue-400 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Uji Lihat Titik di Google Maps
                </a>
              </div>
            </div>

            {/* Geofence Enforcement Switch */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
              <input
                type="checkbox"
                id="enforceLocation"
                checked={!!settings.enforceLocation}
                onChange={(e) => setSettings({ ...settings, enforceLocation: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500"
              />
              <label htmlFor="enforceLocation" className="text-slate-200 font-medium cursor-pointer">
                <strong>Wajibkan Presensi di Dalam Radius Sekolah (Geofencing)</strong>
                <span className="block text-[11px] text-slate-400">
                  Jika dicentang, murid yang berada di luar radius {settings.radiusMeters || 100} meter akan otomatis ditolak dan tidak dapat melakukan presensi.
                </span>
              </label>
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
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
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
                    const res = await apiRequest('/api/admin/sheets/pull-users', { method: 'POST' });
                    alert(res.message || 'Berhasil menarik akun dari spreadsheet.');
                    fetchData();
                  } catch (e: any) {
                    alert('Terjadi kesalahan: ' + e.message);
                  }
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tarik Akun dari Spreadsheet
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
                className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Kirim Seluruh Data ke Spreadsheet
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
