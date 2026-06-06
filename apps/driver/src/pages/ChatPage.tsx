import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

interface ChatMessage {
  id?: string; senderId: string; content: string;
  timestamp: string | Date; pending?: boolean;
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const socketRef = useSocket(token);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const DISPATCHER_ID = import.meta.env.VITE_DISPATCHER_ID ?? '';

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on('message:received', (msg: ChatMessage) => {
      setMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
    });
    return () => { socket.off('message:received'); };
  }, [socketRef.current]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    const socket = socketRef.current;
    if (!socket || !input.trim() || !DISPATCHER_ID) return;
    const msg: ChatMessage = { senderId: user!.id, content: input.trim(), timestamp: new Date(), pending: true };
    setMessages(prev => [...prev, msg]);
    socket.emit('message:send', { to: DISPATCHER_ID, content: input.trim() });
    setInput('');
  }

  const connected = socketRef.current?.connected;

  return (
    <div className="wf-phone" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="wf-phone-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="mono muted"
            style={{ fontSize: 12, cursor: 'pointer' }}
            onClick={() => navigate('/missions')}
          >
            ←
          </span>
          <span style={{ fontWeight: 700 }}>Messagerie Dispatcher</span>
        </div>
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--good)' : 'var(--ink-3)',
            display: 'inline-block',
          }}
        />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 80 }}>
        {messages.length === 0 && (
          <div className="mono muted" style={{ textAlign: 'center', marginTop: 40, fontSize: 12 }}>
            Aucun message pour l'instant
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div
                className={isMe ? 'msg-me' : 'msg-them'}
                style={{
                  maxWidth: '78%', padding: '8px 12px', fontSize: 13,
                  opacity: msg.pending ? 0.65 : 1,
                }}
              >
                <div>{msg.content}</div>
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
        position: 'fixed', bottom: 68, left: 0, right: 0, maxWidth: 430, margin: '0 auto',
        background: 'var(--paper-2)', borderTop: '1.4px dashed var(--ink)',
        padding: '10px 12px', display: 'flex', gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Écrire un message…"
          className="wf-inp"
          style={{ flex: 1 }}
        />
        <button onClick={send} disabled={!input.trim()} className="wf-btn fill sm">
          Envoyer
        </button>
      </div>

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
