import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import { AttendanceRecord } from '../../types/index.js';
import { ArrowLeft, Calendar, Search, Filter, CheckCircle2, Clock, FileText } from 'lucide-react';

interface MuridRiwayatPageProps {
  onNavigate: (route: string) => void;
}

export const MuridRiwayatPage: React.FC<MuridRiwayatPageProps> = ({ onNavigate }) => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
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
    fetchHistory();
  }, []);

  const filtered = history.filter((r) => {
    if (filterMonth && !r.tanggal.startsWith(filterMonth)) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between mb-5">
        <button
          onClick={() => onNavigate('/murid')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <h2 className="text-sm font-bold text-white">Riwayat Kehadiran</h2>
        <span className="w-8" />
      </div>

      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex gap-2">
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Terlambat">Terlambat</option>
          </select>
        </div>

        {/* History List */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Memuat riwayat...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            Tidak ada catatan absensi yang sesuai filter.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{item.tanggal}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.jam} WIB</div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      item.status === 'Hadir'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                    }`}
                  >
                    {item.status}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {item.qrId}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
