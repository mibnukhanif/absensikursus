import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QRCodeConfig, SystemSettings } from '../types/index.js';
import { Printer, Download, X, ShieldCheck, Sparkles, MapPin } from 'lucide-react';
import { BrandLogo } from './BrandLogo.js';

interface QRPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrConfig: QRCodeConfig;
  settings?: SystemSettings | null;
}

export const QRPosterModal: React.FC<QRPosterModalProps> = ({
  isOpen,
  onClose,
  qrConfig,
  settings
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && qrConfig.identifier) {
      QRCode.toDataURL(
        qrConfig.identifier,
        {
          width: 512,
          margin: 2,
          color: {
            dark: '#064e3b', // Deep emerald dark
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
    }
  }, [isOpen, qrConfig.identifier]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Absensi_${qrConfig.identifier}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Modal Top Bar - Hidden in Print */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-bold text-sm tracking-wide">Poster Resmi QR Code Statis</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" /> Unduh PNG
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Poster
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Poster Printable Body */}
        <div
          ref={printAreaRef}
          className="p-8 sm:p-12 bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 text-slate-900 flex flex-col items-center text-center select-none"
        >
          {/* Institution & App Header */}
          <div className="mb-6 flex flex-col items-center">
            <BrandLogo size="lg" className="justify-center mb-3" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              {settings?.institutionName || 'Lembaga Pendidikan Digitalmeera'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-700 font-semibold tracking-wide mt-1">
              {settings?.subTitle || 'Sistem Absensi Digital Berbasis QR Code'}
            </p>
          </div>

          {/* Location Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-semibold mb-6 border border-emerald-200">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Lokasi: {qrConfig.namaLokasi || 'Pintu Masuk Utama'}</span>
          </div>

          {/* Main QR Card */}
          <div className="relative p-6 bg-white rounded-3xl shadow-xl border-4 border-emerald-600 mb-6 flex flex-col items-center max-w-sm w-full">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${qrConfig.identifier}`}
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 rounded-xl animate-pulse" />
            )}

            {/* Token Identifier Pill */}
            <div className="mt-4 px-4 py-1.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs sm:text-sm font-bold tracking-wider">
              {qrConfig.identifier}
            </div>

            <div className="mt-2 text-[11px] text-slate-400 font-medium">
              QR Code Statis Resmi • Aktif Sepanjang Waktu
            </div>
          </div>

          {/* Instructions Box */}
          <div className="w-full max-w-md bg-white/80 rounded-2xl p-5 border border-slate-200 text-left shadow-sm mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Petunjuk Absensi Murid:
            </h4>
            <ol className="text-xs sm:text-sm text-slate-700 space-y-2 list-decimal list-inside font-medium">
              <li>Buka website absensi pada browser smartphone Anda.</li>
              <li>Masuk menggunakan <strong>NIS / Username</strong> dan Password.</li>
              <li>Pilih menu <strong>SCAN QR ABSENSI</strong>.</li>
              <li>Arahkan kamera ke QR Code di atas hingga terdengar nada konfirmasi.</li>
            </ol>
          </div>

          {/* Footer Note */}
          <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-4 w-full text-center">
            Jam Masuk: {settings?.jamMasuk || '07:30'} WIB • {settings?.footerText || '© DIGITALMEERA ABSENSI'}
          </div>
        </div>
      </div>
    </div>
  );
};
