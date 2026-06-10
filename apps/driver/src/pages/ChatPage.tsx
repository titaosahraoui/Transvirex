import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useNotification, notifApi } from '../context/NotificationContext';

interface Dispatcher { id: string; name: string; email: string; }
interface ChatMessage {
  _id?: string; senderId: string; content: string;
  timestamp: string | Date; pending?: boolean;
}

function renderContent(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part}</a>
      : part
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket, resetUnread } = useNotification();

  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [selected, setSelected] = useState<Dispatcher | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/auth/dispatchers').then(r => {
      const list: Dispatcher[] = r.data.data ?? [];
      setDispatchers(list);
      if (list.length === 1) selectDispatcher(list[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      setMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
      resetUnread();
      if (selected) {
        notifApi.patch(`/messages/read?with=${selected.id}`).catch(() => {});
      }
    };
    socket.on('message:received', handler);
    return () => { socket.off('message:received', handler); };
  }, [socket, selected]);

  async function selectDispatcher(dispatcher: Dispatcher) {
    setSelected(dispatcher);
    resetUnread();
    setMessages([]);
    setLoadingHistory(true);
    try {
      const r = await notifApi.get(`/messages?with=${dispatcher.id}&limit=100`);
      setMessages(r.data.data ?? []);
      await notifApi.patch(`/messages/read?with=${dispatcher.id}`);
    } catch (err) {
      console.error('[chat] history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || !socket || !selected) return;
    setMessages(prev => [...prev, { senderId: user!.id, content: text, timestamp: new Date(), pending: true }]);
    socket.emit('message:send', { to: selected.id, content: text });
    setInput('');
  }

  function shareLocation() {
    if (!navigator.geolocation || !socket || !selected) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const text = `📍 Ma position : https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      setMessages(prev => [...prev, { senderId: user!.id, content: text, timestamp: new Date(), pending: true }]);
      socket.emit('message:send', { to: selected.id, content: text });
    }, err => console.error('[GPS chat]', err));
  }

  const connected = socket?.connected;

  return (
    <div className="wf-phone" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="wf-phone-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dispatchers.length > 1 && selected && (
            <span className="mono muted" style={{ fontSize: 12, cursor: 'pointer' }} onClick={() => setSelected(null)}>←</span>
          )}
          <span style={{ fontWeight: 700 }}>
            {selected ? selected.name : 'Messagerie'}
          </span>
        </div>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? 'var(--good)' : 'var(--ink-3)',
          display: 'inline-block',
        }} />
      </div>

      {/* Dispatcher picker (when multiple dispatchers and none selected) */}
      {!selected && dispatchers.length > 1 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <div className="mono muted" style={{ fontSize: 11, marginBottom: 12, textTransform: 'uppercase' }}>
            Choisir un dispatcher
          </div>
          {dispatchers.map(d => (
            <div
              key={d.id}
              onClick={() => selectDispatcher(d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderBottom: '1px dashed rgba(31,29,26,.12)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--hi)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
              }}>
                {d.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                <div className="mono muted" style={{ fontSize: 11 }}>{d.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No dispatchers found */}
      {!selected && dispatchers.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="mono muted" style={{ fontSize: 12, textAlign: 'center' }}>
            Aucun dispatcher disponible
          </div>
        </div>
      )}

      {/* Messages */}
      {selected && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 80 }}>
          {loadingHistory ? (
            <div className="mono muted" style={{ textAlign: 'center', marginTop: 40, fontSize: 12 }}>Chargement…</div>
          ) : messages.length === 0 ? (
            <div className="mono muted" style={{ textAlign: 'center', marginTop: 40, fontSize: 12 }}>Aucun message</div>
          ) : messages.map((msg, i) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div
                  className={isMe ? 'msg-me' : 'msg-them'}
                  style={{ maxWidth: '78%', padding: '8px 12px', fontSize: 13, opacity: msg.pending ? 0.65 : 1 }}
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
      )}

      {/* Input bar (only when conversation selected) */}
      {selected && (
        <div style={{
          position: 'fixed', bottom: 68, left: 0, right: 0, maxWidth: 430, margin: '0 auto',
          background: 'var(--paper-2)', borderTop: '1.4px dashed var(--ink)',
          padding: '10px 12px', display: 'flex', gap: 8,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Écrire un message…"
            className="wf-inp"
            style={{ flex: 1 }}
          />
          <button onClick={shareLocation} className="wf-btn sm" title="Partager ma position">📍</button>
          <button onClick={sendMessage} disabled={!input.trim()} className="wf-btn fill sm">Envoyer</button>
        </div>
      )}

      {/* Tab bar */}
      <nav className="wf-tabbar">
        <button className="wf-tabbar-btn" onClick={() => navigate('/missions')}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span>Missions</span>
        </button>
        <button className="wf-tabbar-btn active" onClick={() => navigate('/chat')}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span>Messagerie</span>
        </button>
      </nav>
    </div>
  );
}
