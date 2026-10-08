import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { BrandLogo } from '../components/BrandLogo.js';
import { QrCode, Shield, Clock, Users, ArrowRight, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { publicInfo } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 py-5 max-w-6xl w-full mx-auto flex items-center justify-between">
        <BrandLogo size="md" light />
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs font-medium text-slate-300">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentDate}</span>
          <span className="text-emerald-400 font-mono font-semibold ml-1">{currentTime}</span>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-4xl w-full mx-auto px-6 py-8 flex flex-col items-center text-center">
        {/* Hero Title & Subtitle */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sistem Presensi Generasi Baru Digitalmeera</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-2xl text-white">
          Absensi Cepat & Akurat dengan{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            QR Code Statis
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
          Platform kehadiran digital mobile-first untuk murid dan institusi pendidikan. Scan kode, waktu tercatat real-time, pantau kehadiran tanpa antrean.
        </p>

        {/* Time display for mobile */}
        <div className="sm:hidden mt-4 inline-flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full text-xs text-slate-300 border border-slate-700">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{currentTime}</span>
        </div>

        {/* Portal Cards Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10 w-full max-w-2xl">
          {/* Card Murid */}
          <div
            onClick={() => onNavigate('/login/murid')}
            className="group relative p-6 sm:p-7 rounded-3xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/50 transition-all duration-300 text-left flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-emerald-950/40 hover:-translate-y-1"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">Portal Utama</span>
              <h3 className="text-xl font-bold text-white mt-1">Masuk sebagai Murid</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Scan QR Code statis untuk absensi harian, lihat status presensi hari ini, dan pantau riwayat kehadiran.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              <span>Buka Portal Murid</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card Admin */}
          <div
            onClick={() => onNavigate('/login/admin')}
            className="group relative p-6 sm:p-7 rounded-3xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/50 transition-all duration-300 text-left flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-indigo-950/40 hover:-translate-y-1"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400">Administrasi</span>
              <h3 className="text-xl font-bold text-white mt-1">Login Administrator</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Dashboard statistik real-time, kelola data murid, monitoring kehadiran, cetak QR Code, dan unduh laporan.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              <span>Masuk ke Dashboard Admin</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Quick Highlights */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-12 max-w-xl w-full text-slate-400 text-xs">
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="font-semibold text-slate-200">QR Statis</span>
            <span className="text-[10px] text-slate-500">Cukup 1 QR Cetak</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
            <Clock className="w-4 h-4 text-teal-400 mb-1" />
            <span className="font-semibold text-slate-200">Server Time</span>
            <span className="text-[10px] text-slate-500">Asia/Jakarta</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
            <Users className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="font-semibold text-slate-200">Anti Dobel</span>
            <span className="text-[10px] text-slate-500">Idempotent Safe</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 gap-3">
        <div>{publicInfo?.footerText || '© DIGITALMEERA ABSENSI. Hak Cipta Dilindungi.'}</div>
        {publicInfo?.adminWhatsApp && (
          <a
            href={`https://wa.me/${publicInfo.adminWhatsApp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Bantuan WhatsApp Admin</span>
          </a>
        )}
      </footer>
    </div>
  );
};
