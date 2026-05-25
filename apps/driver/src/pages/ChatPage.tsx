import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

interface ChatMessage {
  id?: string;
  senderId: string;
  content: string;
  timestamp: string | Date;
  pending?: boolean;
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const socketRef = useSocket(token);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Dispatcher to send to (hardcoded for demo — in production would be a conversation list)
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

    const msg: ChatMessage = {
      senderId:  user!.id,
      content:   input.trim(),
      timestamp: new Date(),
      pending:   true,
    };
    setMessages(prev => [...prev, msg]);
    socket.emit('message:send', { to: DISPATCHER_ID, content: input.trim() });
    setInput('');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0">
        <button onClick={() => navigate('/missions')} className="text-gray-400 text-xl">←</button>
        <h1 className="font-bold">Dispatcher Chat</h1>
        <span className={`ml-auto w-2 h-2 rounded-full ${socketRef.current?.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 mt-12">No messages yet</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm
                ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}
                ${msg.pending ? 'opacity-60' : ''}`}>
                <p>{msg.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message…"
          className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
