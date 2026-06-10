import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useNotification, notifApi } from '../context/NotificationContext';
import { dispatchNav } from '../lib/dispatchNav';

interface Driver {
  id: string; userId: string; name: string; status: string;
  acceptanceRate: string; currentLoad: number; vehicleType: string;
}
interface ChatMessage {
  _id?: string; senderId: string; receiverId: string;
  content: string; timestamp: string | Date; read?: boolean;
}

const STATUS_PILL: Record<string, string> = {
  available: 'good', on_mission: 'warn', offline: '',
};
const STATUS_LABEL: Record<string, string> = {
  available: 'Disponible', on_mission: 'En mission', offline: 'Hors ligne',
};

function renderContent(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part}</a>
      : part
  );
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { driverId: paramDriverId } = useParams<{ driverId?: string }>();
  const navigate = useNavigate();
  const { socket, unreadCounts, resetUnread } = useNotification();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/drivers').then(r => {
      const list: Driver[] = r.data.data ?? [];
      setDrivers(list);
      if (paramDriverId) {
        const match = list.find(d => d.id === paramDriverId || d.userId === paramDriverId);
        if (match) selectDriver(match);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      if (selected && msg.senderId === selected.userId) {
        setMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
        resetUnread(selected.userId);
        notifApi.patch(`/messages/read?with=${selected.userId}`).catch(() => {});
      }
    };
    socket.on('message:received', handler);
    return () => { socket.off('message:received', handler); };
  }, [socket, selected]);

  async function selectDriver(driver: Driver) {
    setSelected(driver);
    resetUnread(driver.userId);
    setMessages([]);
    setLoadingHistory(true);
    try {
      const r = await notifApi.get(`/messages?with=${driver.userId}&limit=100`);
      setMessages(r.data.data ?? []);
      await notifApi.patch(`/messages/read?with=${driver.userId}`);
    } catch (err) {
      console.error('[chat] history load error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || !socket || !selected) return;
    const optimistic: ChatMessage = {
      senderId: user!.id, receiverId: selected.userId,
      content: text, timestamp: new Date(),
    };
    setMessages(prev => [...prev, optimistic]);
    socket.emit('message:send', { to: selected.userId, content: text });
    setInput('');
  }

  function shareLocation() {
    if (!navigator.geolocation || !socket || !selected) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const text = `📍 Position : https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      const optimistic: ChatMessage = {
        senderId: user!.id, receiverId: selected.userId,
        content: text, timestamp: new Date(),
      };
      setMessages(prev => [...prev, optimistic]);
      socket.emit('message:send', { to: selected.userId, content: text });
    }, err => console.error('[GPS]', err));
  }

  const sortedDrivers = [...drivers].sort((a, b) => {
    const ua = unreadCounts[a.userId] ?? 0;
    const ub = unreadCounts[b.userId] ?? 0;
    return ub - ua;
  });

  return (
    <div className="wf-shell">
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Dispatcher · {user?.name}</div>
        {dispatchNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'chat' ? 'on' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span> {item.label}
            </div>
          );
        })}
        <div className="side-bottom">
          <div className="side-logout" onClick={logout}>↩ Déconnexion</div>
        </div>
      </aside>

      <main className="wf-shell-main" style={{ overflow: 'hidden' }}>
        <div className="wf-appbar">
          <span className="bar-crumbs">Messagerie / Chauffeurs</span>
          <div className="bar-actions">
            <span className={`wf-pill ${socket?.connected ? 'good' : ''}`} style={{ fontSize: 10 }}>
              {socket?.connected ? 'Connecté' : 'Hors ligne'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 46px)' }}>
          {/* Driver list */}
          <div style={{ width: 280, flexShrink: 0, borderRight: '1.3px dashed rgba(31,29,26,.2)', overflowY: 'auto' }}>
            {sortedDrivers.length === 0 ? (
              <div className="mono muted" style={{ textAlign: 'center', padding: '32px 12px', fontSize: 11 }}>
                Aucun chauffeur
              </div>
            ) : sortedDrivers.map(d => {
              const unread = unreadCounts[d.userId] ?? 0;
              return (
                <div
                  key={d.id}
                  onClick={() => selectDriver(d)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px dashed rgba(31,29,26,.12)',
                    cursor: 'pointer',
                    background: selected?.id === d.id ? 'var(--paper-2)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--hi)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13,
                    }}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {d.name}
                        {unread > 0 && (
                          <span style={{
                            background: 'var(--bad)', color: '#fff', borderRadius: '50%',
                            width: 18, height: 18, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {unread}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className={`wf-pill ${STATUS_PILL[d.status] ?? ''}`} style={{ fontSize: 9 }}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                        <span className="mono muted" style={{ fontSize: 10 }}>
                          {d.vehicleType || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversation panel */}
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div className="mono muted" style={{ fontSize: 12 }}>Sélectionnez un chauffeur pour démarrer</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Conversation header */}
              <div style={{
                padding: '10px 16px', borderBottom: '1.3px dashed rgba(31,29,26,.2)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--hi)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: 13,
                }}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.name}</div>
                  <div className="mono muted" style={{ fontSize: 10 }}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loadingHistory ? (
                  <div className="mono muted" style={{ textAlign: 'center', padding: '20px 0', fontSize: 11 }}>Chargement…</div>
                ) : messages.length === 0 ? (
                  <div className="mono muted" style={{ textAlign: 'center', marginTop: 40, fontSize: 12 }}>Aucun message</div>
                ) : messages.map((msg, i) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div
                        className={isMe ? 'msg-me' : 'msg-them'}
                        style={{ maxWidth: '70%', padding: '8px 12px', fontSize: 13 }}
                      >
                        <div>{renderContent(msg.content)}</div>
                        <div className="mono" style={{ fontSize: 9, opacity: 0.6, marginTop: 3 }}>
                          {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div style={{
                padding: '10px 14px', borderTop: '1.3px dashed rgba(31,29,26,.2)',
                display: 'flex', gap: 8, background: 'var(--paper)',
              }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Écrire un message…"
                  className="wf-inp"
                  style={{ flex: 1 }}
                />
                <button onClick={shareLocation} className="wf-btn sm" title="Partager position">📍</button>
                <button onClick={sendMessage} disabled={!input.trim()} className="wf-btn fill sm">Envoyer</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
