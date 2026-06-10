import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NOTIFICATION_URL = import.meta.env.VITE_NOTIFICATION_URL ?? 'http://localhost:4005';

export const notifApi = axios.create({ baseURL: NOTIFICATION_URL });
notifApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Toast { id: number; message: string; type?: string; }

interface NotificationContextValue {
  socket: Socket | null;
  toasts: Toast[];
  dismiss: (id: number) => void;
  unreadCount: number;
  resetUnread: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const toastIdRef = useRef(0);

  function addToast(message: string, type?: string) {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!token) return;

    const s = io(NOTIFICATION_URL, { auth: { token }, transports: ['websocket'] });
    setSocket(s);

    s.on('connect', () => console.log('[notif] connected'));
    s.on('connect_error', (err) => console.error('[notif] error:', err.message));

    s.on('message:received', () => {
      setUnreadCount(prev => prev + 1);
      addToast('💬 Nouveau message du dispatcher', 'message');
    });

    s.on('mission:assigned', (data: { missionId: string }) => {
      addToast(`Nouvelle mission assignée : ${data.missionId?.slice(-6) ?? ''}`, 'success');
    });

    s.on('mission:status', (data: { status: string }) => {
      addToast(`Statut mission : ${data.status}`, 'info');
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return (
    <NotificationContext.Provider value={{ socket, toasts, dismiss, unreadCount, resetUnread }}>
      {children}
      <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', width: '90%', maxWidth: 400 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: 'var(--paper, #faf7f1)',
              border: '1.5px solid var(--ink, #1f1d1a)',
              borderRadius: 6, padding: '10px 14px', textAlign: 'center',
              fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 700,
              boxShadow: '2px 2px 0 var(--ink, #1f1d1a)',
              pointerEvents: 'all', cursor: 'pointer',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used inside NotificationProvider');
  return ctx;
}
