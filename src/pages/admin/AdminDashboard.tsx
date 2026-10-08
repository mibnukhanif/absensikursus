import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { DashboardSummary, ChartDayData, AttendanceRecord } from '../../types/index.js';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  QrCode,
  PlusCircle,
  Calendar,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<ChartDayData[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/admin/dashboard');
      if (res.success) {
        setSummary(res.summary);
        setChartData(res.chartData || []);
        setRecentAttendance(res.recentAttendance || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const maxChartCount = Math.max(...chartData.map((d) => d.count), 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Date Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Panel Kontrol</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Dashboard Presensi</h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau kehadiran murid hari ini secara real-time berdasarkan waktu server Asia/Jakarta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('/admin/qrcode')}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-emerald-950/40"
          >
            <QrCode className="w-4 h-4" /> Lihat QR Absensi
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Murid */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Total Murid</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{summary?.totalMurid ?? 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Murid Berstatus Aktif</span>
        </div>

        {/* Hadir Hari Ini */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Hadir Hari Ini</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{summary?.hadirHariIni ?? 0}</div>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">Sudah Memindai QR</span>
        </div>

        {/* Belum Absen */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Belum Absen</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{summary?.belumAbsen ?? 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Menunggu Presensi</span>
        </div>

        {/* Persentase Kehadiran */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Tingkat Kehadiran</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400">
            {summary?.persentaseKehadiran ?? 0}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary?.persentaseKehadiran || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Attendance Trend Chart + Quick Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Days Attendance Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Tren Kehadiran 7 Hari Terakhir</h3>
              <p className="text-xs text-slate-400">Grafik perbandingan total murid yang hadir setiap harinya</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Asia/Jakarta</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-800">
            {chartData.map((item, idx) => {
              const heightPct = Math.round((item.count / maxChartCount) * 100);
              const isToday = idx === chartData.length - 1;
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[11px] font-mono text-slate-400 group-hover:text-white transition">
                    {item.count}
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-xl flex items-end h-32 overflow-hidden p-1">
                    <div
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-700 hover:bg-emerald-600/70'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold truncate ${isToday ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Tools & Shortcuts */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Aksi Cepat Admin</h3>
            <p className="text-xs text-slate-400 mb-5">Jalan pintas pengelolaan yang sering digunakan</p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('/admin/murid')}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Tambah Data Murid</div>
                    <div className="text-[10px] text-slate-400">Daftarkan murid baru ke sistem</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                onClick={() => onNavigate('/admin/qrcode')}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Cetak Poster QR</div>
                    <div className="text-[10px] text-slate-400">Download & print poster absensi</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>

              <button
                onClick={() => onNavigate('/admin/laporan')}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Unduh Rekap Laporan</div>
                    <div className="text-[10px] text-slate-400">Ekspor presensi ke Excel/CSV</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Server Timezone: Asia/Jakarta terverifikasi aktif</span>
          </div>
        </div>
      </div>

      {/* Live Recent Attendance Feed Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Log Presensi Terkini</h3>
            <p className="text-xs text-slate-400">Daftar murid yang baru saja melakukan scan absensi</p>
          </div>
          <button
            onClick={() => onNavigate('/admin/absensi')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Lihat Semua Log <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAttendance.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada catatan absensi hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Nama Murid</th>
                  <th className="py-2.5 px-3">NIS</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Jam (WIB)</th>
                  <th className="py-2.5 px-3">Shift</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Titik Koordinat / Maps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentAttendance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">{row.nama}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{row.nis}</td>
                    <td className="py-3 px-3 text-emerald-400 font-medium">{row.kelas}</td>
                    <td className="py-3 px-3 text-slate-400">{row.tanggal}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{row.jam}</td>
                    <td className="py-3 px-3 text-indigo-400 font-medium">{row.shift || 'Reguler'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'Hadir'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {row.latitude && row.longitude ? (
                        <a
                          href={row.mapsUrl || `https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 hover:underline bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded-lg"
                        >
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
