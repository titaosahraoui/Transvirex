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
  unreadCounts: Record<string, number>;
  resetUnread: (userId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const toastIdRef = useRef(0);

  function addToast(message: string, type?: string) {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const resetUnread = useCallback((userId: string) => {
    setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
  }, []);

  useEffect(() => {
    if (!token) return;

    const s = io(NOTIFICATION_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => console.log('[notif] connected'));
    s.on('connect_error', (err) => console.error('[notif] error:', err.message));

    s.on('message:received', (msg: { senderId: string; content: string }) => {
      setUnreadCounts(prev => ({
        ...prev,
        [msg.senderId]: (prev[msg.senderId] ?? 0) + 1,
      }));
      addToast('💬 Nouveau message reçu', 'message');
    });

    s.on('mission:status', (data: { missionId: string; status: string }) => {
      addToast(`Mission ${data.missionId.slice(-6)} : ${data.status}`, 'info');
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token]);

  return (
    <NotificationContext.Provider value={{ socket, toasts, dismiss, unreadCounts, resetUnread }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: 'var(--paper, #faf7f1)',
              border: '1.5px solid var(--ink, #1f1d1a)',
              borderRadius: 6, padding: '10px 14px',
              fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
              boxShadow: '2px 2px 0 var(--ink, #1f1d1a)',
              pointerEvents: 'all', cursor: 'pointer',
              maxWidth: 280,
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
