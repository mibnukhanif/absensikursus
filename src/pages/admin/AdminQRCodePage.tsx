import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { apiRequest } from '../../api/client.js';
import { QRCodeConfig, SystemSettings } from '../../types/index.js';
import { QRPosterModal } from '../../components/QRPosterModal.js';
import {
  QrCode,
  Download,
  Printer,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles,
  MapPin,
  Save
} from 'lucide-react';

export const AdminQRCodePage: React.FC = () => {
  const [qrConfig, setQrConfig] = useState<QRCodeConfig | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [posterModalOpen, setPosterModalOpen] = useState(false);

  // Edit states
  const [identifierInput, setIdentifierInput] = useState('');
  const [namaLokasiInput, setNamaLokasiInput] = useState('');
  const [statusInput, setStatusInput] = useState<'aktif' | 'nonaktif'>('aktif');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchQR = async () => {
    try {
      setLoading(true);
      const [resQr, resSettings] = await Promise.all([
        apiRequest<QRCodeConfig>('/api/admin/qrcode'),
        apiRequest<SystemSettings>('/api/admin/settings')
      ]);

      if (resQr.success && resQr.data) {
        setQrConfig(resQr.data);
        setIdentifierInput(resQr.data.identifier);
        setNamaLokasiInput(resQr.data.namaLokasi);
        setStatusInput(resQr.data.status);
        generateQrImage(resQr.data.identifier);
      }

      if (resSettings.success && resSettings.data) {
        setSettings(resSettings.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const generateQrImage = (text: string) => {
    QRCode.toDataURL(
      text,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#064e3b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  };

  useEffect(() => {
    fetchQR();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) return;

    setSaving(true);
    setSaveSuccess(false);

    const res = await apiRequest('/api/admin/qrcode', {
      method: 'PUT',
      body: JSON.stringify({
        identifier: identifierInput.trim().toUpperCase(),
        namaLokasi: namaLokasiInput.trim(),
        status: statusInput
      })
    });

    setSaving(false);

    if (res.success && res.data) {
      setQrConfig(res.data);
      generateQrImage(res.data.identifier);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl || !qrConfig) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Absensi_${qrConfig.identifier}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Konfigurasi Sentral</span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Kelola QR Code Statis</h1>
          <p className="text-xs text-slate-400 mt-1">
            QR Code statis resmi presensi Digitalmeera untuk dicetak dan dipasang di lokasi absensi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPosterModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-indigo-950/40"
          >
            <Printer className="w-4 h-4" /> Cetak Poster Resmi
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Unduh PNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: QR Code Preview Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview QR Code</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                qrConfig?.status === 'aktif'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {qrConfig?.status === 'aktif' ? 'Status: Aktif' : 'Status: Nonaktif'}
            </span>
          </div>

          <div className="p-4 bg-white rounded-3xl border-4 border-emerald-600/80 shadow-2xl my-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Statis"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 rounded-xl animate-pulse" />
            )}
          </div>

          <div className="mt-4 px-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs font-bold tracking-wider">
            {qrConfig?.identifier}
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>{qrConfig?.namaLokasi}</span>
          </div>

          <div className="mt-6 flex gap-2 w-full">
            <button
              onClick={() => setPosterModalOpen(true)}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Poster
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>

        {/* Right: QR Code Settings Form & Knowledge Box */}
        <div className="lg:col-span-2 space-y-6">
          {/* Settings Form */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1">Pengaturan Identifier QR Code</h3>
            <p className="text-xs text-slate-400 mb-5">
              Ubah token pengenal atau nonaktifkan sistem absensi sewaktu-waktu jika diperlukan
            </p>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Konfigurasi QR Code berhasil diperbarui di server.</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Identifier Token QR Code *
                </label>
                <input
                  type="text"
                  required
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value.toUpperCase())}
                  placeholder="DIGITALMEERA-ABSENSI-001"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Token ini adalah isi data dari QR Code yang akan dibaca oleh pemindai kamera murid.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama / Keterangan Lokasi</label>
                <input
                  type="text"
                  value={namaLokasiInput}
                  onChange={(e) => setNamaLokasiInput(e.target.value)}
                  placeholder="Contoh: Pintu Masuk Utama Gedung Digitalmeera"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status Penggunaan</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as 'aktif' | 'nonaktif')}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="aktif">Aktif (Murid dapat melakukan absensi)</option>
                  <option value="nonaktif">Nonaktif (Absensi ditutup)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </form>
          </div>

          {/* Principle Explanation Box */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Konsep QR Statis vs Absensi Dinamis
            </h4>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                <strong>QR Code tetap statis</strong>: Anda cukup mencetak poster QR ini <strong>satu kali</strong> dan menempelkannya di papan presensi, gerbang, atau kelas.
              </p>
              <p>
                <strong>Data absensi tetap dinamis</strong>: Setiap murid yang melakukan scan menghasilkan data unik tersendiri berdasarkan identitas akun murid yang login, jam server, tanggal hari itu, dan status kehadiran.
              </p>
              <p className="text-slate-400">
                Admin tidak perlu repot membuat atau mencetak kode QR baru setiap hari!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Poster Modal */}
      {qrConfig && (
        <QRPosterModal
          isOpen={posterModalOpen}
          onClose={() => setPosterModalOpen(false)}
          qrConfig={qrConfig}
          settings={settings}
        />
      )}
    </div>
  );
};
