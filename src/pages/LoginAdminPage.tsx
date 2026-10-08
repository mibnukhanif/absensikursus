import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { BrandLogo } from '../components/BrandLogo.js';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';

interface LoginAdminPageProps {
  onNavigate: (route: string) => void;
}

export const LoginAdminPage: React.FC<LoginAdminPageProps> = ({ onNavigate }) => {
  const { loginAdmin, checkSetupStatus } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState(true);

  useEffect(() => {
    checkSetupStatus().then((exists) => setHasAdmin(exists));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Email/Username dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const res = await loginAdmin(identifier.trim(), password);
    setLoading(false);

    if (res.success) {
      onNavigate('/admin');
    } else {
      setErrorMessage(res.message || 'Login admin gagal.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-0.5 rounded-full">
          Portal Admin
        </span>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <BrandLogo size="md" light className="mb-4" />
            <h2 className="text-xl font-bold text-white tracking-tight">Login Administrator</h2>
            <p className="text-xs text-slate-400 mt-1">
              Akses panel kontrol sistem absensi & manajemen murid
            </p>
          </div>

          {/* Quick Credential Hint Box */}
          <div className="mb-5 p-3 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Kredensial Default:
              </span>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('admin');
                  setPassword('admin12345');
                }}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
              >
                Isi Otomatis
              </button>
            </div>
            <div className="mt-1.5 text-slate-300 font-mono text-[11px] flex flex-wrap gap-x-3 gap-y-0.5">
              <span>User: <strong className="text-white">admin</strong></span>
              <span>Pass: <strong className="text-white">admin12345</strong></span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              *Tersimpan di Spreadsheet & Code.gs. Dapat diubah kapan saja.
            </p>
          </div>

          {/* Setup notice if no admin */}
          {!hasAdmin && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <p className="font-semibold text-amber-300">Belum ada akun Admin terdaftar!</p>
              <p className="mt-1 text-slate-300">
                Sistem mendeteksi database kosong. Silakan inisialisasi akun Super Admin pertama Anda.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/setup')}
                className="mt-2.5 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Inisialisasi Admin Pertama
              </button>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email / Username Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan username atau email admin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi admin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Login Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center flex flex-col gap-2">
            <button
              onClick={() => onNavigate('/login/murid')}
              className="text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              Beralih ke Halaman Login Murid
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="max-w-md w-full mx-auto text-center py-2 text-[11px] text-slate-500">
        Hak akses terbatas. Seluruh aktivitas login dipantau dan diaudit.
      </div>
    </div>
  );
};
