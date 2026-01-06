import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../api/config';

type RoleName =
  | 'HR_PERSONNEL'
  | 'OFFICE_MANAGER'
  | 'FINANCE'
  | 'VIEW_ONLY'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  roles: RoleName[] | string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial load: try to get current user from session
  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser({
              id: data.user.id,
              username: data.user.username,
              fullName: data.user.fullName,
              roles: data.user.roles ?? [],
            });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error || data?.message || 'Login failed';
      throw new Error(msg);
    }

    const data = await res.json();
    if (data?.user) {
      setUser({
        id: data.user.id,
        username: data.user.username,
        fullName: data.user.fullName,
        roles: data.user.roles ?? [],
      });
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 text-sm">Checking session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const RequireRole: React.FC<{ 
  children: React.ReactNode;
  allowedRoles: RoleName[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 text-sm">{t('checkingSession') || 'Checking session...'}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = user.roles as RoleName[];
  const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

  if (!hasRequiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {t('accessDenied') || 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {t('insufficientPermissions') || 'You do not have permission to access this page.'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};


