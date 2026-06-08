import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NOTIF_URL = import.meta.env.VITE_NOTIFICATION_URL ?? 'http://localhost:4005';

interface Toast { id: number; type: 'success' | 'warning'; message: string; }
interface NotificationContextValue { toasts: Toast[]; dismiss: (id: number) => void; socket: Socket | null; }
const NotificationContext = createContext<NotificationContextValue>({ toasts: [], dismiss: () => {}, socket: null });

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [, forceUpdate] = useState(0);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  useEffect(() => {
    if (!token) return;
    const s = io(NOTIF_URL, { auth: { token } });
    socketRef.current = s;
    forceUpdate(n => n + 1);

    s.on('payment:recorded', (data: { amount: string }) => {
      addToast('success', `💳 Paiement de ${parseFloat(data.amount).toLocaleString('fr-FR')} DZD enregistré`);
    });
    s.on('invoice:paid', (data: { amount: string }) => {
      addToast('success', `✓ Facture payée — ${parseFloat(data.amount).toLocaleString('fr-FR')} DZD encaissés`);
    });
    s.on('invoice:overdue', (data: { clientName: string; amount: string }) => {
      addToast('warning', `⚠ Facture en retard — ${data.clientName} · ${parseFloat(data.amount).toLocaleString('fr-FR')} DZD`);
    });

    return () => { s.disconnect(); socketRef.current = null; };
  }, [token, addToast]);

  return (
    <NotificationContext.Provider value={{ toasts, dismiss, socket: socketRef.current }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'warning' ? 'var(--hi)' : 'var(--good)',
            color: t.type === 'warning' ? 'var(--ink)' : '#fff',
            padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.4,
            boxShadow: '2px 3px 0 var(--ink)', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => dismiss(t.id)}>✕</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() { return useContext(NotificationContext); }
