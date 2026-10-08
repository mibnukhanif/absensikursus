import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { BrandLogo } from '../../components/BrandLogo.js';
import { QRScannerModal, GeoLocationCoords } from '../../components/QRScannerModal.js';
import { apiRequest } from '../../api/client.js';
import { AttendanceRecord, PresensiShift } from '../../types/index.js';
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
  Bell,
  MapPin,
  ExternalLink,
  Layers
} from 'lucide-react';

interface MuridDashboardProps {
  onNavigate: (route: string) => void;
}

export const MuridDashboard: React.FC<MuridDashboardProps> = ({ onNavigate }) => {
  const { user, logout, publicInfo } = useAuth();
  const murid = user && user.role === 'murid' ? user : null;

  const [hasAttended, setHasAttended] = useState<boolean>(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scanProcessing, setScanProcessing] = useState<boolean>(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [deviceCoords, setDeviceCoords] = useState<GeoLocationCoords | null>(null);
  const deviceCoordsRef = React.useRef<GeoLocationCoords | null>(null);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'already' | 'invalid' | 'error' | 'location_error';
    title: string;
    message: string;
    data?: any;
  } | null>(null);

  // Pre-warm device GPS location in background as soon as dashboard mounts
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: GeoLocationCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          };
          setDeviceCoords(c);
          deviceCoordsRef.current = c;
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    }
  }, []);

  // Active shifts from public info
  const activeShifts: PresensiShift[] = (publicInfo?.shifts && publicInfo.shifts.length > 0)
    ? publicInfo.shifts.filter((s) => s.aktif)
    : [
        { id: 'shift-pagi', nama: 'Shift Pagi / Reguler', jamMasuk: '07:30', jamPulang: '15:00', aktif: true }
      ];

  useEffect(() => {
    if (activeShifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(activeShifts[0].id);
    }
  }, [activeShifts]);

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

  const handleScanSubmit = async (scannedCode: string, coords?: GeoLocationCoords | null) => {
    setScanProcessing(true);
    const finalLat = coords?.latitude ?? deviceCoordsRef.current?.latitude ?? null;
    const finalLon = coords?.longitude ?? deviceCoordsRef.current?.longitude ?? null;
    const finalAcc = coords?.accuracy ?? deviceCoordsRef.current?.accuracy ?? null;

    try {
      const res = await apiRequest('/api/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          qrIdentifier: scannedCode,
          latitude: finalLat,
          longitude: finalLon,
          accuracy: finalAcc,
          shiftId: selectedShiftId || undefined
        })
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
      } else if (res.code === 'LOCATION_OUT_OF_BOUNDS') {
        setScanResult({
          type: 'location_error',
          title: '📍 DI LUAR RADIUS SEKOLAH',
          message: res.message || 'Posisi Anda berada di luar area presensi yang diizinkan.',
          data: res.data
        });
      } else if (res.code === 'LOCATION_REQUIRED') {
        setScanResult({
          type: 'location_error',
          title: '📍 IZIN LOKASI DIPERLUKAN',
          message: res.message || 'Akses lokasi GPS perangkat wajib aktif untuk melakukan presensi.',
          data: res.data
        });
      } else if (res.code === 'QR_INVALID') {
        setScanResult({
          type: 'invalid',
          title: '🔴 QR CODE TIDAK VALID',
          message: res.message || 'QR Code tidak dikenali. Silakan scan kembali QR Code absensi resmi Digitalmeera.'
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
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
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
              <div className="bg-slate-900/80 px-4 py-2.5 rounded-2xl text-xs font-mono text-slate-300 mb-3 border border-slate-800 w-full max-w-xs text-left space-y-1">
                {scanResult.data.tanggal && <div>Tanggal: <span className="text-white font-semibold">{scanResult.data.tanggal}</span></div>}
                {scanResult.data.jam && <div>Waktu: <span className="text-white font-semibold">{scanResult.data.jam} WIB</span></div>}
                {scanResult.data.shift && <div>Shift: <span className="text-indigo-400 font-semibold">{scanResult.data.shift}</span></div>}
                {scanResult.data.status && <div>Status: <span className="text-emerald-400 font-semibold">{scanResult.data.status}</span></div>}
                {scanResult.data.latitude && (
                  <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">GPS: {scanResult.data.latitude.toFixed(5)}, {scanResult.data.longitude.toFixed(5)}</span>
                    <a
                      href={`https://www.google.com/maps?q=${scanResult.data.latitude},${scanResult.data.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <MapPin className="w-3 h-3" /> Maps
                    </a>
                  </div>
                )}
                {scanResult.data.jarakMeter !== undefined && (
                  <div className="text-[11px] text-slate-400">Jarak: <span className="text-white font-bold">{scanResult.data.jarakMeter}m</span> dari sekolah</div>
                )}
              </div>
            )}

            <div className="flex gap-2 w-full max-w-xs">
              {scanResult.type !== 'success' && (
                <button
                  onClick={() => {
                    setScanResult(null);
                    setScannerOpen(true);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Scan Ulang
                </button>
              )}
              <button
                onClick={() => setScanResult(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Tutup
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
                Kehadiran Anda telah diverifikasi pada pukul{' '}
                <strong className="text-white font-mono">{todayRecord.jam} WIB</strong> dengan status{' '}
                <strong className="text-emerald-400">{todayRecord.status}</strong>.
              </p>

              {/* Attendance Details Grid */}
              <div className="w-full bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 text-xs space-y-2 text-left mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Waktu Tercatat</span>
                    <span className="font-mono font-bold text-white">{todayRecord.jam} WIB</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Shift Presensi</span>
                    <span className="font-bold text-indigo-400">{todayRecord.shift || 'Shift Reguler'}</span>
                  </div>
                </div>

                {/* Location Details Box */}
                <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" /> Titik Lokasi Presensi:
                    </span>
                    {todayRecord.latitude && todayRecord.longitude ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {todayRecord.lokasiStatus || 'Sesuai Radius'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Tidak Terdata</span>
                    )}
                  </div>

                  {todayRecord.latitude && todayRecord.longitude ? (
                    <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1.5 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Koordinat GPS:</span>
                        <span className="text-white font-bold">
                          {todayRecord.latitude.toFixed(6)}, {todayRecord.longitude.toFixed(6)}
                        </span>
                      </div>
                      {todayRecord.jarakMeter !== null && todayRecord.jarakMeter !== undefined && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-sans">
                          <span className="text-slate-400">Jarak ke Sekolah:</span>
                          <span className="font-bold text-emerald-300">
                            {todayRecord.jarakMeter} meter
                          </span>
                        </div>
                      )}
                      {todayRecord.accuracy && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans">
                          <span>Akurasi GPS Perangkat:</span>
                          <span>±{todayRecord.accuracy} meter</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-500 text-center">
                      Titik koordinat GPS tidak terdeteksi saat presensi dilakukan.
                    </div>
                  )}

                  {todayRecord.latitude && todayRecord.longitude && (
                    <a
                      href={todayRecord.mapsUrl || `https://www.google.com/maps?q=${todayRecord.latitude},${todayRecord.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>Buka Titik Lokasi di Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    </a>
                  )}
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

              {/* Shift Selector if multiple */}
              {activeShifts.length > 1 ? (
                <div className="w-full my-3 text-left">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Pilih Shift Presensi:
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {activeShifts.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.nama} ({sh.jamMasuk} - {sh.jamPulang})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="my-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-400" />
                  <span>{activeShifts[0]?.nama || 'Shift Reguler'} ({activeShifts[0]?.jamMasuk} - {activeShifts[0]?.jamPulang})</span>
                </div>
              )}

              <p className="text-xs text-slate-400 max-w-xs mb-5">
                Scan QR Code di lokasi sekolah. Titik koordinat GPS Anda akan otomatis diverifikasi.
              </p>

              {/* Big Scan Button */}
              <button
                onClick={() => setScannerOpen(true)}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer"
              >
                <QrCode className="w-5 h-5 animate-pulse" />
                <span>SCAN QR ABSENSI</span>
              </button>
            </div>
          )}
        </div>

        {/* RECENT ATTENDANCE HISTORY */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-400" /> RIWAYAT TERAKHIR
            </h3>
            <button
              onClick={() => onNavigate('/murid/riwayat')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 cursor-pointer"
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
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{rec.tanggal}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {rec.jam} WIB • <span className="text-indigo-400 font-sans">{rec.shift || 'Reguler'}</span>
                        </div>
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

                  {rec.latitude && rec.longitude && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1 font-mono text-[10px]">
                        <MapPin className="w-3 h-3 text-rose-400" /> {rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}
                      </span>
                      <a
                        href={rec.mapsUrl || `https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 text-[11px]"
                      >
                        Lihat Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
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
          className="flex flex-col items-center gap-1 text-emerald-400 cursor-pointer"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Absensi</span>
        </button>

        <button
          onClick={() => setScannerOpen(true)}
          className="-mt-5 p-3 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-950/60 border-2 border-slate-900 cursor-pointer"
          title="Scan QR"
        >
          <QrCode className="w-6 h-6" />
        </button>

        <button
          onClick={() => onNavigate('/murid/riwayat')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium">Riwayat</span>
        </button>

        <button
          onClick={() => onNavigate('/murid/profil')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </nav>

      {/* QR Scanner Modal with GPS Location Integration */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSubmit}
        isProcessing={scanProcessing}
        initialCoords={deviceCoords}
      />
    </div>
  );
};
