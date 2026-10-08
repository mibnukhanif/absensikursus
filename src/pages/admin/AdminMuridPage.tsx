import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { MuridUser } from '../../types/index.js';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
  X,
  Phone,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export const AdminMuridPage: React.FC = () => {
  const [muridList, setMuridList] = useState<MuridUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMurid, setSelectedMurid] = useState<MuridUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nis: '',
    nama: '',
    kelas: '',
    username: '',
    noHp: '',
    password: '',
    status: 'aktif'
  });
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMurid = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (kelasFilter) queryParams.set('kelas', kelasFilter);
      if (statusFilter) queryParams.set('status', statusFilter);

      const res = await apiRequest(`/api/admin/murid?${queryParams.toString()}`);
      if (res.success && res.data) {
        setMuridList(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMurid();
    handleSyncSheets();
  }, [kelasFilter, statusFilter]);

  const handleSyncSheets = async () => {
    try {
      setSyncingSheets(true);
      setSyncMsg(null);
      const res = await apiRequest('/api/admin/sheets/pull-all', { method: 'POST' });
      if (res.success) {
        setSyncMsg(res.message || 'Sinkronisasi dengan Google Spreadsheet berhasil!');
        await fetchMurid();
      } else {
        setSyncMsg(res.message || 'Gagal sinkronisasi data dari Spreadsheet.');
      }
    } catch (err: any) {
      setSyncMsg('Gagal terhubung ke spreadsheet: ' + err.message);
    } finally {
      setSyncingSheets(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMurid();
  };

  const openAddModal = () => {
    setFormData({
      nis: '',
      nama: '',
      kelas: '',
      username: '',
      noHp: '',
      password: '',
      status: 'aktif'
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis || !formData.nama || !formData.kelas || !formData.password) {
      setFormError('NIS, Nama, Kelas, dan Password wajib diisi.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const res = await apiRequest('/api/admin/murid', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    setSubmitting(false);

    if (res.success) {
      setIsAddModalOpen(false);
      setSyncMsg(res.message || 'Data murid berhasil ditambahkan dan langsung tersimpan ke Google Spreadsheet!');
      setTimeout(() => setSyncMsg(null), 6000);
      fetchMurid();
    } else {
      setFormError(res.message || 'Gagal menambahkan murid.');
    }
  };

  const openEditModal = (m: MuridUser) => {
    setSelectedMurid(m);
    setFormData({
      nis: m.nis,
      nama: m.nama,
      kelas: m.kelas,
      username: m.username,
      noHp: m.noHp || '',
      password: '',
      status: m.status
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMurid) return;

    setSubmitting(true);
    setFormError(null);

    const res = await apiRequest(`/api/admin/murid/${selectedMurid.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });

    setSubmitting(false);

    if (res.success) {
      setIsEditModalOpen(false);
      setSyncMsg(res.message || 'Data murid berhasil diperbarui dan disinkronkan ke Spreadsheet!');
      setTimeout(() => setSyncMsg(null), 6000);
      fetchMurid();
    } else {
      setFormError(res.message || 'Gagal memperbarui data murid.');
    }
  };

  const openResetModal = (m: MuridUser) => {
    setSelectedMurid(m);
    setResetPasswordVal('');
    setFormError(null);
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMurid || !resetPasswordVal) return;

    if (resetPasswordVal.length < 6) {
      setFormError('Password minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const res = await apiRequest(`/api/admin/murid/${selectedMurid.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: resetPasswordVal })
    });

    setSubmitting(false);

    if (res.success) {
      setIsResetModalOpen(false);
      setSyncMsg(`Password untuk ${selectedMurid.nama} berhasil direset.`);
      setTimeout(() => setSyncMsg(null), 5000);
    } else {
      setFormError(res.message || 'Gagal mereset password.');
    }
  };

  const openDeleteModal = (m: MuridUser) => {
    setSelectedMurid(m);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMurid) return;
    setSubmitting(true);

    const res = await apiRequest(`/api/admin/murid/${selectedMurid.id}`, {
      method: 'DELETE'
    });

    setSubmitting(false);
    setIsDeleteModalOpen(false);

    if (res.success) {
      setSyncMsg(res.message || `Data murid ${selectedMurid.nama} berhasil dihapus/dinonaktifkan.`);
      setTimeout(() => setSyncMsg(null), 5000);
      fetchMurid();
    }
  };

  // Unique class list for filter
  const uniqueClasses = Array.from(new Set(muridList.map((m) => m.kelas))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Manajemen Pengguna</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Data Murid</h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola pendaftaran akun murid, kelas, status aktif/nonaktif, dan kredensial akses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSyncSheets}
            disabled={syncingSheets}
            className="px-3.5 py-2.5 rounded-2xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-indigo-950/40 disabled:opacity-50 cursor-pointer"
            title="Tarik Data Murid dari Google Spreadsheet"
          >
            <FileSpreadsheet className={`w-4 h-4 ${syncingSheets ? 'animate-bounce text-emerald-300' : ''}`} />
            {syncingSheets ? 'Menyinkronkan...' : 'Tarik dari Spreadsheet'}
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Tambah Murid Baru
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMsg && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncMsg}</span>
          </div>
          <button
            onClick={() => setSyncMsg(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama murid, NIS, atau username..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex gap-2">
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Kelas</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>

          <button
            onClick={fetchMurid}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Murid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Memuat data murid...</div>
        ) : muridList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Belum ada data murid terdaftar atau sesuai filter. Silakan tambahkan murid baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">No WhatsApp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {muridList.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">{m.nis}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{m.nama}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-semibold">{m.kelas}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{m.username}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {m.noHp ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-500" /> {m.noHp}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          m.status === 'aktif'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {m.status === 'aktif' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openResetModal(m)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Edit Murid"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(m)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                          title="Hapus / Nonaktifkan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Murid */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" /> Tambah Murid Baru
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nomor Induk Siswa (NIS) *</label>
                <input
                  type="text"
                  required
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="Contoh: 202601001"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Nama lengkap murid"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kelas *</label>
                  <input
                    type="text"
                    required
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    placeholder="Contoh: 10-A atau 5B"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Username Login</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  value={formData.noHp}
                  onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Kata Sandi Awal *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Buat kata sandi akun murid"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Simpan & Masukkan ke Spreadsheet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Murid */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" /> Edit Data Murid
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nomor Induk Siswa (NIS)</label>
                <input
                  type="text"
                  required
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">No. WhatsApp</label>
                <input
                  type="tel"
                  value={formData.noHp}
                  onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memperbarui ke Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Perbarui di Spreadsheet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" /> Reset Password Murid
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Setel kata sandi baru untuk <strong>{selectedMurid?.nama}</strong> ({selectedMurid?.nis})
            </p>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Password Baru (Min. 6 Karakter)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Nonaktifkan / Hapus Murid?</h3>
            <p className="text-xs text-slate-400 mb-5">
              Murid <strong>{selectedMurid?.nama}</strong> akan dinonaktifkan dari sistem. Histori absensi tetap tersimpan aman.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
              >
                {submitting ? 'Memproses...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
