import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { BrandLogo } from '../../components/BrandLogo.js';
import { QRScannerModal } from '../../components/QRScannerModal.js';
import { apiRequest } from '../../api/client.js';
import { AttendanceRecord } from '../../types/index.js';
import {
  QrCode,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  History,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';

interface MuridDashboardProps {
  onNavigate: (route: string) => void;
}

export const MuridDashboard: React.FC<MuridDashboardProps> = ({ onNavigate }) => {
  const { user, logout, refreshProfile } = useAuth();
  const murid = user && user.role === 'murid' ? user : null;

  const [hasAttended, setHasAttended] = useState<boolean>(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scanProcessing, setScanProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'already' | 'invalid' | 'error';
    title: string;
    message: string;
    data?: any;
  } | null>(null);

  const fetchTodayStatus = async () => {
    try {
      const res = await apiRequest('/api/attendance/today');
      if (res.success) {
        setHasAttended(res.hasAttended);
        setTodayRecord(res.attendance);
      }
    } catch {
      // ignore
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiRequest<AttendanceRecord[]>('/api/attendance/history');
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
  }, []);

  const handleScanSubmit = async (scannedCode: string) => {
    setScanProcessing(true);
    try {
      const res = await apiRequest('/api/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({ qrIdentifier: scannedCode })
      });

      setScanProcessing(false);
      setScannerOpen(false);

      if (res.success) {
        setScanResult({
          type: 'success',
          title: '🟢 ABSENSI BERHASIL',
          message: res.message || 'Absensi Anda berhasil dicatat.',
          data: res.data
        });
        setHasAttended(true);
        setTodayRecord(res.data);
        fetchHistory();
      } else if (res.code === 'ALREADY_ATTENDED') {
        setScanResult({
          type: 'already',
          title: '🟡 ANDA SUDAH ABSEN',
          message: res.message || 'Anda sudah melakukan absensi hari ini.',
          data: res.data
        });
        setHasAttended(true);
        setTodayRecord(res.data);
      } else if (res.code === 'QR_INVALID') {
        setScanResult({
          type: 'invalid',
          title: '🔴 QR CODE TIDAK VALID',
          message: res.message || 'QR Code tidak dikenali. Silakan scan kembali QR Code absensi Digitalmeera.'
        });
      } else {
        setScanResult({
          type: 'error',
          title: '🔴 ABSENSI GAGAL',
          message: res.message || 'Terjadi gangguan saat memproses absensi.'
        });
      }
    } catch (err: any) {
      setScanProcessing(false);
      setScannerOpen(false);
      setScanResult({
        type: 'error',
        title: '🔴 GANGGUAN KONEKSI',
        message: 'Terjadi gangguan koneksi. Silakan coba lagi.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 sm:pb-8">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <BrandLogo size="sm" light showSubtitle={false} />

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/murid/profil')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 transition"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{murid?.nama?.split(' ')[0] || 'Murid'}</span>
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto px-4 pt-5 space-y-5 flex-1">
        {/* Student Profile Identity Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-900/40 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-950/50">
              {murid?.nama ? murid.nama.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-400">Selamat Datang,</div>
              <h2 className="text-base font-bold text-white leading-tight">{murid?.nama || 'Murid'}</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px] text-slate-300">
                  NIS: {murid?.nis}
                </span>
                <span className="font-semibold text-emerald-300">Kelas: {murid?.kelas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Result Modal / Banner if just scanned */}
        {scanResult && (
          <div
            className={`p-5 rounded-3xl border shadow-xl flex flex-col items-center text-center transition-all ${
              scanResult.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                : scanResult.type === 'already'
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                scanResult.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : scanResult.type === 'already'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {scanResult.type === 'success' ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : scanResult.type === 'already' ? (
                <Clock className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>

            <h3 className="text-base font-black tracking-tight text-white mb-1">{scanResult.title}</h3>
            <p className="text-xs leading-relaxed max-w-xs mb-3">{scanResult.message}</p>

            {scanResult.data && (
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl text-xs font-mono text-slate-300 mb-3 border border-slate-800 w-full max-w-xs text-left space-y-1">
                <div>Tanggal: <span className="text-white font-semibold">{scanResult.data.tanggal}</span></div>
                <div>Waktu: <span className="text-white font-semibold">{scanResult.data.jam} WIB</span></div>
                <div>Status: <span className="text-emerald-400 font-semibold">{scanResult.data.status}</span></div>
              </div>
            )}

            <div className="flex gap-2 w-full max-w-xs">
              {scanResult.type !== 'success' && (
                <button
                  onClick={() => {
                    setScanResult(null);
                    setScannerOpen(true);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Scan Ulang
                </button>
              )}
              <button
                onClick={() => setScanResult(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Tutup Notifikasi
              </button>
            </div>
          </div>
        )}

        {/* PRIMARY CARD: ABSENSI HARI INI */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" /> ABSENSI HARI INI
            </span>
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' })}
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
              <span className="text-xs text-slate-400">Memeriksa status kehadiran...</span>
            </div>
          ) : hasAttended && todayRecord ? (
            /* SUDAH ABSEN STATE */
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-lg shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs mb-2 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Sudah Absen
              </div>
              <p className="text-xs text-slate-300 max-w-xs mb-4">
                Kehadiran Anda telah diverifikasi oleh server pada pukul{' '}
                <strong className="text-white font-mono">{todayRecord.jam} WIB</strong> dengan status{' '}
                <strong className="text-emerald-400">{todayRecord.status}</strong>.
              </p>

              <div className="w-full bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 text-xs grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-slate-500 text-[10px] block">Waktu Tercatat</span>
                  <span className="font-mono font-bold text-white">{todayRecord.jam} WIB</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Status Presensi</span>
                  <span className="font-bold text-emerald-400">{todayRecord.status}</span>
                </div>
              </div>
            </div>
          ) : (
            /* BELUM ABSEN STATE */
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3 shadow-lg shadow-amber-950/50">
                <Clock className="w-9 h-9" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs mb-2 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Belum Absen
              </div>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                Silakan scan QR Code statis Digitalmeera yang tersedia di lokasi untuk mencatat kehadiran hari ini.
              </p>

              {/* Big Scan Button */}
              <button
                onClick={() => setScannerOpen(true)}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 transition transform active:scale-95"
              >
                <QrCode className="w-5 h-5 animate-pulse" />
                <span>SCAN QR ABSENSI</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Recent Attendance Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" /> Riwayat Kehadiran Terbaru
            </h4>
            <button
              onClick={() => onNavigate('/murid/riwayat')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
            >
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-500">
              Belum ada riwayat absensi yang tercatat.
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{rec.tanggal}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{rec.jam} WIB</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                    rec.status === 'Hadir'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-2.5 flex items-center justify-around sm:hidden">
        <button
          onClick={() => onNavigate('/murid')}
          className="flex flex-col items-center gap-1 text-emerald-400"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Absensi</span>
        </button>

        <button
          onClick={() => setScannerOpen(true)}
          className="-mt-5 p-3 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-950/60 border-2 border-slate-900"
          title="Scan QR"
        >
          <QrCode className="w-6 h-6" />
        </button>

        <button
          onClick={() => onNavigate('/murid/riwayat')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium">Riwayat</span>
        </button>

        <button
          onClick={() => onNavigate('/murid/profil')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </nav>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSubmit}
        isProcessing={scanProcessing}
      />
    </div>
  );
};
