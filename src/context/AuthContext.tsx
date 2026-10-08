import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, PublicInfo } from '../types/index.js';
import { apiRequest, setStoredToken, clearStoredToken } from '../api/client.js';

interface AuthContextType {
  user: AuthUser | null;
  role: 'admin' | 'murid' | null;
  loading: boolean;
  publicInfo: PublicInfo | null;
  checkSetupStatus: () => Promise<boolean>;
  loginMurid: (nisOrUsername: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginAdmin: (emailOrUsername: string, password: string) => Promise<{ success: boolean; message?: string }>;
  setupInitialAdmin: (data: { name: string; email: string; username: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchPublicInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<'admin' | 'murid' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);

  const fetchPublicInfo = async () => {
    try {
      const res = await apiRequest<PublicInfo>('/api/public/info');
      if (res && res.appName) {
        setPublicInfo(res as unknown as PublicInfo);
      }
    } catch {
      // ignore
    }
  };

  const checkSetupStatus = async (): Promise<boolean> => {
    try {
      const res = await apiRequest<{ hasAdmin: boolean }>('/api/auth/setup-status');
      return !!res.hasAdmin;
    } catch {
      return true;
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
        setRole(res.user.role);
      } else {
        setUser(null);
        setRole(null);
        clearStoredToken();
      }
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicInfo();
    refreshProfile();
  }, []);

  const loginMurid = async (identifier: string, password: string) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });

    if (res.success && res.token && res.user) {
      setStoredToken(res.token);
      setUser(res.user);
      setRole('murid');
      return { success: true, message: res.message };
    }

    return {
      success: false,
      message: res.message || 'Login gagal. Periksa NIS/Username dan password.'
    };
  };

  const loginAdmin = async (identifier: string, password: string) => {
    const res = await apiRequest('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });

    if (res.success && res.token && res.user) {
      setStoredToken(res.token);
      setUser(res.user);
      setRole('admin');
      return { success: true, message: res.message };
    }

    return {
      success: false,
      message: res.message || 'Login admin gagal. Periksa email/username dan password.'
    };
  };

  const setupInitialAdmin = async (data: { name: string; email: string; username: string; password: string }) => {
    const res = await apiRequest('/api/auth/setup-initial-admin', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (res.success && res.token && res.user) {
      setStoredToken(res.token);
      setUser(res.user);
      setRole('admin');
      fetchPublicInfo();
      return { success: true, message: res.message };
    }

    return {
      success: false,
      message: res.message || 'Gagal melakukan inisialisasi administrator.'
    };
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearStoredToken();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        publicInfo,
        checkSetupStatus,
        loginMurid,
        loginAdmin,
        setupInitialAdmin,
        logout,
        refreshProfile,
        fetchPublicInfo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
