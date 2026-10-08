import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { HomePage } from './pages/HomePage.js';
import { LoginMuridPage } from './pages/LoginMuridPage.js';
import { LoginAdminPage } from './pages/LoginAdminPage.js';
import { SetupAdminPage } from './pages/SetupAdminPage.js';
import { MuridDashboard } from './pages/murid/MuridDashboard.js';
import { MuridRiwayatPage } from './pages/murid/MuridRiwayatPage.js';
import { MuridProfilePage } from './pages/murid/MuridProfilePage.js';
import { AdminLayout } from './pages/admin/AdminLayout.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminMuridPage } from './pages/admin/AdminMuridPage.js';
import { AdminAbsensiPage } from './pages/admin/AdminAbsensiPage.js';
import { AdminQRCodePage } from './pages/admin/AdminQRCodePage.js';
import { AdminLaporanPage } from './pages/admin/AdminLaporanPage.js';
import { AdminPengaturanPage } from './pages/admin/AdminPengaturanPage.js';
import { RefreshCw } from 'lucide-react';

function AppRouter() {
  const { user, role, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-xs text-slate-400 font-medium">Memuat Digitalmeera Absensi...</span>
      </div>
    );
  }

  // --- ROUTE MATCHING & PROTECTION ---

  // Initial Admin Setup Route
  if (currentPath === '/setup') {
    return <SetupAdminPage onNavigate={navigate} />;
  }

  // Murid Authentication Routes
  if (currentPath === '/login/murid' || currentPath === '/login') {
    if (user && role === 'murid') {
      return <MuridDashboard onNavigate={navigate} />;
    }
    return <LoginMuridPage onNavigate={navigate} />;
  }

  // Admin Authentication Route
  if (currentPath === '/login/admin') {
    if (user && role === 'admin') {
      return (
        <AdminLayout currentPath="/admin" onNavigate={navigate}>
          <AdminDashboard onNavigate={navigate} />
        </AdminLayout>
      );
    }
    return <LoginAdminPage onNavigate={navigate} />;
  }

  // Murid Protected Routes
  if (currentPath.startsWith('/murid')) {
    if (!user || role !== 'murid') {
      return <LoginMuridPage onNavigate={navigate} />;
    }

    if (currentPath === '/murid/riwayat') {
      return <MuridRiwayatPage onNavigate={navigate} />;
    }
    if (currentPath === '/murid/profil') {
      return <MuridProfilePage onNavigate={navigate} />;
    }
    return <MuridDashboard onNavigate={navigate} />;
  }

  // Admin Protected Routes
  if (currentPath.startsWith('/admin')) {
    if (!user || role !== 'admin') {
      return <LoginAdminPage onNavigate={navigate} />;
    }

    return (
      <AdminLayout currentPath={currentPath} onNavigate={navigate}>
        {currentPath === '/admin/murid' ? (
          <AdminMuridPage />
        ) : currentPath === '/admin/absensi' ? (
          <AdminAbsensiPage />
        ) : currentPath === '/admin/qrcode' ? (
          <AdminQRCodePage />
        ) : currentPath === '/admin/laporan' ? (
          <AdminLaporanPage />
        ) : currentPath === '/admin/pengaturan' ? (
          <AdminPengaturanPage />
        ) : (
          <AdminDashboard onNavigate={navigate} />
        )}
      </AdminLayout>
    );
  }

  // Default Home Portal
  return <HomePage onNavigate={navigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
