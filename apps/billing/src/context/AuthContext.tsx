import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:4000';
export const api = axios.create({ baseURL: GATEWAY });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface User { id: string; email: string; name: string; role: string; }
interface AuthContextValue { user: User | null; token: string | null; login: (e: string, p: string) => Promise<void>; register: (email: string, password: string, name: string, phone?: string) => Promise<void>; logout: () => void; loading: boolean; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('jwt_token');
    if (!saved) { setLoading(false); return; }
    setToken(saved);
    api.get('/auth/me').then(r => setUser(r.data.data)).catch(() => localStorage.removeItem('jwt_token')).finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = r.data.data;
    localStorage.setItem('jwt_token', t); setToken(t); setUser(u);
  }

  async function register(email: string, password: string, name: string, phone?: string) {
    const r = await api.post('/auth/register', { email, password, name, phone, role: 'billing' });
    const { token: t, user: u } = r.data.data;
    localStorage.setItem('jwt_token', t); setToken(t); setUser(u);
  }

  function logout() { localStorage.removeItem('jwt_token'); setToken(null); setUser(null); }

  return <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
