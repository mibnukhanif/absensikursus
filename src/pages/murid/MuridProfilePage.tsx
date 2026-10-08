import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import { ArrowLeft, User, Lock, Phone, BookOpen, Key, CheckCircle2, AlertCircle } from 'lucide-react';

interface MuridProfilePageProps {
  onNavigate: (route: string) => void;
}

export const MuridProfilePage: React.FC<MuridProfilePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const murid = user && user.role === 'murid' ? user : null;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setStatusMessage({ type: 'error', text: 'Password saat ini dan baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const res = await apiRequest('/api/murid/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });

    setLoading(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Kata sandi berhasil diperbarui.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'Gagal mengubah kata sandi.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 pb-20">
      <div className="max-w-md w-full mx-auto flex items-center justify-between mb-5">
        <button
          onClick={() => onNavigate('/murid')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <h2 className="text-sm font-bold text-white">Profil & Pengaturan Akun</h2>
        <span className="w-8" />
      </div>

      <div className="max-w-md w-full mx-auto space-y-5">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center">
              {murid?.nama ? murid.nama.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{murid?.nama}</h3>
              <p className="text-xs text-emerald-400 font-medium">Murid Aktif Digitalmeera</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-500" /> Nomor Induk Siswa (NIS)
              </span>
              <span className="font-mono font-bold text-white">{murid?.nis}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Kelas
              </span>
              <span className="font-bold text-emerald-300">{murid?.kelas}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Nomor WhatsApp
              </span>
              <span className="font-medium text-slate-300">{murid?.noHp || '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Status Akun</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold text-[11px] border border-emerald-800/60">
                {murid?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-emerald-400" /> Ubah Kata Sandi Akun
          </h4>

          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Password Saat Ini
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Kata sandi lama"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Password Baru (Min. 6 Karakter)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi baru"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
