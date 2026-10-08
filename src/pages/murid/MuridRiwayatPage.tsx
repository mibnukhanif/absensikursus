import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import { AttendanceRecord } from '../../types/index.js';
import { ArrowLeft, Calendar, Search, Filter, CheckCircle2, Clock, FileText, MapPin, ExternalLink } from 'lucide-react';

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
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-900 cursor-pointer"
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
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{item.tanggal}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {item.jam} WIB • <span className="text-indigo-400 font-sans">{item.shift || 'Reguler'}</span>
                      </div>
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
                  </div>
                </div>

                {item.latitude && item.longitude ? (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-slate-200">{item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</span>
                      </span>
                      {item.jarakMeter !== null && item.jarakMeter !== undefined && (
                        <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                          {item.jarakMeter}m ({item.lokasiStatus || 'Dalam Radius'})
                        </span>
                      )}
                    </div>
                    <a
                      href={item.mapsUrl || `https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 w-full py-1.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 font-medium flex items-center justify-center gap-1.5 text-xs transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-400" /> Buka Google Maps <ExternalLink className="w-3 h-3 text-blue-400" />
                    </a>
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-600" /> Lokasi GPS: Tidak terdeteksi
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
