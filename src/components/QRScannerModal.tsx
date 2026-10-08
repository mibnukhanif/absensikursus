import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, Zap, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';

export interface GeoLocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string, coords?: GeoLocationCoords | null) => void;
  isProcessing?: boolean;
  initialCoords?: GeoLocationCoords | null;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  isProcessing = false,
  initialCoords = null
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // GPS Coordinates state and ref to avoid stale closures during requestAnimationFrame
  const [gpsCoords, setGpsCoords] = useState<GeoLocationCoords | null>(initialCoords || null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const gpsCoordsRef = useRef<GeoLocationCoords | null>(initialCoords || null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const hasDetectedRef = useRef<boolean>(false);

  // Sync initialCoords if provided
  useEffect(() => {
    if (initialCoords) {
      gpsCoordsRef.current = initialCoords;
      setGpsCoords(initialCoords);
    }
  }, [initialCoords]);

  // Fetch device GPS location whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if ('geolocation' in navigator) {
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords: GeoLocationCoords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy)
            };
            gpsCoordsRef.current = coords;
            setGpsCoords(coords);
            setGpsLoading(false);
            setGpsError(null);
          },
          (err) => {
            console.warn('GPS location error:', err);
            // If we don't have initialCoords, record error
            if (!gpsCoordsRef.current) {
              setGpsError(err.message || 'Izin lokasi tidak diberikan');
            }
            setGpsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      } else {
        setGpsError('Perangkat tidak mendukung GPS.');
      }
    }
  }, [isOpen]);

  // Play audio chime when successfully scanned
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  const startCamera = async () => {
    stopCamera();
    setErrorMsg(null);
    hasDetectedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Perangkat Anda tidak mendukung akses kamera browser.');
      setHasCameraPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // essential for iOS Safari
        await videoRef.current.play();
        scanFrame();
      }

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setErrorMsg('Gagal membuka kamera: ' + (err.message || 'Terjadi gangguan.'));
      }
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const newStatus = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: newStatus } as any]
        });
        setTorchOn(newStatus);
      } catch (e) {
        console.error('Torch error', e);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const scanFrame = () => {
    if (hasDetectedRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data && code.data.trim().length > 0) {
          hasDetectedRef.current = true;
          playBeep();
          stopCamera();

          const coordsToSend = gpsCoordsRef.current;
          if (!coordsToSend && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const liveCoords: GeoLocationCoords = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: Math.round(pos.coords.accuracy)
                };
                gpsCoordsRef.current = liveCoords;
                onScanSuccess(code.data.trim(), liveCoords);
              },
              () => {
                onScanSuccess(code.data.trim(), null);
              },
              { enableHighAccuracy: true, timeout: 2000, maximumAge: 30000 }
            );
          } else {
            onScanSuccess(code.data.trim(), coordsToSend);
          }
          return;
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scan QR Absensi</h3>
              <p className="text-xs text-slate-400">Arahkan kamera ke QR Code Digitalmeera</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Status Indicator Banner */}
        <div className="px-5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className={`w-3.5 h-3.5 ${gpsCoords ? 'text-emerald-400' : gpsLoading ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <span>
              {gpsLoading ? 'Mendeteksi titik koordinat GPS...' : gpsCoords ? (
                <span className="text-emerald-300 font-mono">
                  {gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)} (±{gpsCoords.accuracy || 10}m)
                </span>
              ) : gpsError ? (
                <span className="text-amber-400">GPS: {gpsError}</span>
              ) : (
                <span className="text-slate-400">Menunggu koordinat GPS...</span>
              )}
            </span>
          </div>
          {gpsCoords && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              GPS Siap
            </span>
          )}
        </div>

        {/* Viewport / Video Area */}
        <div className="relative flex-1 bg-black aspect-square flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Aim Box Overlay */}
          {!errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
              <div className="relative w-64 h-64 border-2 border-emerald-500/60 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                {/* Laser animation */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
              <p className="font-semibold text-emerald-300">Memvalidasi absensi...</p>
            </div>
          )}

          {/* Error / Permission Overlay */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-white mb-1">Akses Kamera Bermasalah</h4>
              <p className="text-xs text-slate-300 mb-5 max-w-xs leading-relaxed">{errorMsg}</p>
              
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  onClick={startCamera}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </button>
                <button
                  onClick={() => setShowManualInput(true)}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Masukkan Kode QR Manual
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="px-5 py-4 bg-slate-900 flex items-center justify-between border-t border-slate-800">
          <div className="flex items-center gap-2">
            {/* Flip Camera */}
            <button
              onClick={toggleCameraFacing}
              className="p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Ganti Kamera Depan/Belakang"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Torch / Flashlight */}
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-3 rounded-2xl transition ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Lampu Senter"
              >
                <Zap className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Option for manual input */}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition"
          >
            {showManualInput ? 'Tutup Input Manual' : 'Input Kode Manual'}
          </button>
        </div>

        {/* Manual Input Drawer */}
        {showManualInput && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Masukkan Identifier QR (misal: DIGITALMEERA-ABSENSI-001)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="DIGITALMEERA-ABSENSI-001"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 uppercase focus:outline-none focus:border-emerald-500"
              />
              <button
                disabled={!manualCode.trim() || isProcessing}
                onClick={() => {
                  stopCamera();
                  onScanSuccess(manualCode.trim(), gpsCoordsRef.current);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
              >
                Kirim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
