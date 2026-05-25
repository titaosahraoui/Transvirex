import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const NOTIFICATION_URL = import.meta.env.VITE_NOTIFICATION_URL ?? 'http://localhost:4005';

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(NOTIFICATION_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => console.log('[socket] connected'));
    socket.on('connect_error', (err) => console.error('[socket] error:', err.message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef;
}
