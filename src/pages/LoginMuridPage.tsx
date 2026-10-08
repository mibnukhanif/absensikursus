import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { BrandLogo } from '../components/BrandLogo.js';
import { QrCode, Lock, User, ArrowLeft, AlertCircle, MessageSquare, Shield, CheckCircle } from 'lucide-react';

interface LoginMuridPageProps {
  onNavigate: (route: string) => void;
}

export const LoginMuridPage: React.FC<LoginMuridPageProps> = ({ onNavigate }) => {
  const { loginMurid, publicInfo } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNotRegistered, setIsNotRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('NIS/Username dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsNotRegistered(false);

    const res = await loginMurid(identifier.trim(), password);
    setLoading(false);

    if (res.success) {
      onNavigate('/murid');
    } else {
      setErrorMessage(res.message || 'Login gagal.');
      if (res.message && res.message.toLowerCase().includes('belum terdaftar')) {
        setIsNotRegistered(true);
      }
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
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
          Portal Murid
        </span>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <BrandLogo size="md" light className="mb-4" />
            <h2 className="text-xl font-bold text-white tracking-tight">Login Presensi Murid</h2>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan Nomor Induk Siswa (NIS) atau Username Anda
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
                {isNotRegistered && publicInfo?.adminWhatsApp && (
                  <a
                    href={`https://wa.me/${publicInfo.adminWhatsApp.replace(/[^0-9]/g, '')}?text=Halo%20Admin%20Digitalmeera,%20saya%20ingin%20mendaftarkan%20akun%20murid%20dengan%20NIS:%20${encodeURIComponent(identifier)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Hubungi Admin via WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / NIS
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: 202601001 atau ahmad"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
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
                  placeholder="Masukkan kata sandi akun murid"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Masuk sebagai Murid</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center flex flex-col gap-2">
            <button
              onClick={() => onNavigate('/login/admin')}
              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1.5 transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Login sebagai Administrator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="max-w-md w-full mx-auto text-center py-2 text-[11px] text-slate-500">
        Pastikan akun Anda sudah didaftarkan oleh Administrator Digitalmeera.
      </div>
    </div>
  );
};
