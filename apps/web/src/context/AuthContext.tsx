'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, ApiError, type AuthUser } from '@/lib/auth';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  /** Error de conexión/servidor detectado al verificar la sesión — distinto de "no autenticado" (401). */
  authError: string | null;
  login:    (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout:   () => Promise<void>;
  setUser:  (u: AuthUser | null) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    authApi.me().then(d => setUser(d.user)).catch(err => {
      // 401 = genuinely no hay sesión activa; cualquier otra falla (servidor caído, red)
      // no debe interpretarse como "cerrar sesión" — el usuario podría seguir autenticado
      // en el servidor, solo no pudimos confirmarlo ahora mismo.
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        setAuthError(err instanceof Error ? err.message : 'No se pudo verificar tu sesión.');
      }
    }).finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const d = await authApi.login(email, password);
    setUser(d.user);
  }

  async function register(email: string, name: string, password: string) {
    const d = await authApi.register(email, name, password);
    setUser(d.user);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, authError, login, register, logout, setUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
