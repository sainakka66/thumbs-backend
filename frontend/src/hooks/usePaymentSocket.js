import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, TOKEN_KEY } from '../config/env';

/**
 * Live payment updates — connects only during active payment (avoids idle WebSocket errors).
 */
export function usePaymentSocket(onUpdate, enabled = false) {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return undefined;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;

    const base = (API_BASE_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (!base || base.startsWith('/')) return undefined;

    const socket = io(base, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 4,
      reconnectionDelay: 2000,
      timeout: 20000,
      autoConnect: true,
    });
    socketRef.current = socket;

    const onPayment = (payload) => onUpdateRef.current?.(payload);
    socket.on('payment:update', onPayment);
    socket.on('connect_error', () => {
      /* polling fallback — non-fatal */
    });

    return () => {
      socket.off('payment:update', onPayment);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return socketRef;
}
