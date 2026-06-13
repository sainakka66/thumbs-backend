import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, TOKEN_KEY } from '../config/env';

export function usePaymentSocket(onUpdate) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;

    const base = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const socket = io(base, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.warn('[payments] socket connect_error', err?.message);
    });

    socket.on('payment:update', (payload) => {
      onUpdate?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [onUpdate]);

  return socketRef;
}
