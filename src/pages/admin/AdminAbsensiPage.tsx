import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { AttendanceRecord } from '../../types/index.js';
import {
  CalendarCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  MapPin,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

export const AdminAbsensiPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [kelas, setKelas] = useState('');
  const [status, setStatus] = useState('');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tanggal) params.set('tanggal', tanggal);
      if (kelas) params.set('kelas', kelas);
      if (status) params.set('status', status);

      const res = await apiRequest(`/api/admin/attendance?${params.toString()}`);
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSheets = async () => {
    try {
      setSyncingSheets(true);
      setSyncMsg(null);
      const res = await apiRequest('/api/admin/sheets/pull-all', { method: 'POST' });
      if (res.success) {
        setSyncMsg(res.message || 'Sinkronisasi data presensi dengan Google Spreadsheet berhasil!');
        await fetchAttendance();
      } else {
        setSyncMsg(res.message || 'Gagal sinkronisasi data.');
      }
    } catch (err: any) {
      setSyncMsg('Gagal terhubung ke spreadsheet: ' + err.message);
    } finally {
      setSyncingSheets(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [tanggal, kelas, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendance();
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (tanggal) params.set('tanggal', tanggal);
    if (kelas) params.set('kelas', kelas);
    window.location.href = `/api/admin/export-csv?${params.toString()}`;
  };

  const uniqueClasses = Array.from(new Set(records.map((r) => r.kelas))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Monitoring Real-Time</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Log & Riwayat Absensi</h1>
          <p className="text-xs text-slate-400 mt-1">
            Data absensi harian murid yang diverifikasi secara server-side dengan zona waktu Asia/Jakarta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncSheets}
            disabled={syncingSheets}
            className="px-3.5 py-2.5 rounded-2xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-indigo-950/40 disabled:opacity-50 cursor-pointer"
            title="Tarik Data Presensi dari Google Spreadsheet"
          >
            <FileSpreadsheet className={`w-4 h-4 ${syncingSheets ? 'animate-bounce text-emerald-300' : ''}`} />
            {syncingSheets ? 'Menyinkronkan...' : 'Tarik dari Spreadsheet'}
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Ekspor ke CSV / Excel
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

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIS murid..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Kelas</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Terlambat">Terlambat</option>
          </select>

          <button
            onClick={fetchAttendance}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Memuat log absensi...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Tidak ada catatan absensi yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam (WIB)</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Titik Koordinat / Maps</th>
                  <th className="py-3 px-4">Jarak</th>
                  <th className="py-3 px-4">Token QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-white">{r.nama}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{r.nis}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">{r.kelas}</td>
                    <td className="py-3 px-4 text-slate-300">{r.tanggal}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">{r.jam}</td>
                    <td className="py-3 px-4 text-indigo-400 font-semibold">{r.shift || 'Reguler'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.status === 'Hadir'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.latitude && r.longitude ? (
                        <a
                          href={r.mapsUrl || `https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-400 hover:text-blue-300 hover:underline bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded-lg"
                        >
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-300 font-mono">
                      {r.jarakMeter !== null && r.jarakMeter !== undefined ? `${r.jarakMeter}m` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{r.qrId}</td>
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
