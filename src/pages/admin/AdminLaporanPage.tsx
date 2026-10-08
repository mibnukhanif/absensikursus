import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { AttendanceRecord, SystemSettings } from '../../types/index.js';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Table
} from 'lucide-react';

export const AdminLaporanPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (kelas) params.set('kelas', kelas);

      const [resAtt, resSet] = await Promise.all([
        apiRequest<AttendanceRecord[]>(`/api/admin/attendance?${params.toString()}`),
        apiRequest<SystemSettings>('/api/admin/settings')
      ]);

      if (resAtt.success && resAtt.data) {
        setRecords(resAtt.data);
      }
      if (resSet.success && resSet.data) {
        setSettings(resSet.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, kelas]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (kelas) params.set('kelas', kelas);
    window.location.href = `/api/admin/export-csv?${params.toString()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const totalHadir = records.filter((r) => r.status === 'Hadir').length;
  const totalTerlambat = records.filter((r) => r.status === 'Terlambat').length;

  return (
    <div className="space-y-6">
      {/* Header - Hidden in Print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Rekapitulasi Kehadiran</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Laporan Presensi Murid</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate rekap presensi berdasarkan rentang tanggal dan kelas dalam format cetak atau spreadsheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-emerald-950/40"
          >
            <Download className="w-4 h-4" /> Ekspor CSV / Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filter Card - Hidden in Print */}
      <div className="print:hidden bg-slate-900 border border-slate-800 p-4 rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Kelas</label>
          <input
            type="text"
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            placeholder="Contoh: 10-A atau kosongkan"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">Total Record Absensi</span>
          <span className="text-xl sm:text-2xl font-black text-white">{records.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-emerald-400 block mb-1">Status Hadir Tepat Waktu</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">{totalHadir}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[11px] text-amber-400 block mb-1">Status Terlambat</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400">{totalTerlambat}</span>
        </div>
      </div>

      {/* Formal Printable Document Layout */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Formal Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950">
            {settings?.institutionName || 'LEMBAGA PENDIDIKAN DIGITALMEERA'}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {settings?.institutionAddress || 'Jl. Merdeka Digital No. 88, Indonesia'}
          </p>
          <div className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 py-1 rounded-lg">
            LAPORAN REKAPITULASI PRESENSI MURID BERBASIS QR CODE
          </div>
          {(startDate || endDate || kelas) && (
            <div className="mt-2 text-[11px] text-slate-500 font-mono">
              Filter: {startDate ? `Dari ${startDate}` : ''} {endDate ? `s/d ${endDate}` : ''}{' '}
              {kelas ? `• Kelas: ${kelas}` : ''}
            </div>
          )}
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Memuat data laporan...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Tidak ada catatan absensi pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100 text-slate-800 font-bold">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">NIS</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{i + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold">{r.nis}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.nama}</td>
                    <td className="py-2.5 px-3 font-medium">{r.kelas}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.tanggal}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{r.jam} WIB</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold ${
                          r.status === 'Hadir' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formal Signature Area for Print */}
        <div className="hidden print:flex justify-between mt-12 pt-8 text-xs text-slate-800">
          <div className="text-center w-48">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Bagian Kesiswaan</p>
            <div className="h-16" />
            <p className="border-t border-slate-400 font-semibold">( ........................................ )</p>
          </div>

          <div className="text-center w-48">
            <p>Dicetak Pada: {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
            <p className="font-bold">Administrator Sistem</p>
            <div className="h-16" />
            <p className="border-t border-slate-400 font-semibold">( ........................................ )</p>
          </div>
        </div>
      </div>
    </div>
  );
};
