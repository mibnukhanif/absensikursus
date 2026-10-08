import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  light?: boolean;
  logoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  light = false,
  logoUrl
}) => {
  let authPublicInfo = null;
  try {
    const auth = useAuth();
    authPublicInfo = auth.publicInfo;
  } catch {
    // Auth context might not wrap this in standalone previews
  }

  const [imageError, setImageError] = useState(false);
  const rawLogo = logoUrl !== undefined ? logoUrl : authPublicInfo?.appLogo;
  const activeLogo = rawLogo && rawLogo.trim() !== '' ? rawLogo.trim() : null;
  const appName = authPublicInfo?.appName || 'DIGITALMEERA ABSENSI';
  const subTitle = authPublicInfo?.subTitle || 'Sistem Absensi Digital Berbasis QR Code';

  useEffect(() => {
    setImageError(false);
  }, [activeLogo]);

  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  }[size];

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }[size];

  const subSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Visual Logo Emblem or Custom Uploaded Logo */}
      {activeLogo && !imageError ? (
        <div className={`relative flex items-center justify-center rounded-2xl overflow-hidden bg-white border border-emerald-500/30 p-1 shadow-md shrink-0 ${iconDimensions}`}>
          <img
            src={activeLogo}
            alt={appName}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      ) : (
        <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 p-2 shadow-lg shadow-emerald-900/20 text-white shrink-0 ${iconDimensions}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full transform transition-transform group-hover:scale-105"
          >
            {/* Graduation Cap / Modern Diamond Hexagon */}
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
            {/* Digital QR Scan Node */}
            <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
      )}

      <div className="flex flex-col">
        <div className={`font-black tracking-tight leading-none ${light ? 'text-white' : 'text-slate-900'} ${titleSizes}`}>
          {appName.includes('DIGITALMEERA') ? (
            <>
              DIGITAL<span className="text-emerald-500">MEERA</span>
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ABSENSI
              </span>
            </>
          ) : (
            <span>{appName}</span>
          )}
        </div>
        {showSubtitle && (
          <span className={`mt-1 font-medium tracking-normal ${light ? 'text-slate-300' : 'text-slate-500'} ${subSizes}`}>
            {subTitle}
          </span>
        )}
      </div>
    </div>
  );
};
