'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from '@/components/ui/use-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SocketNotification {
  id: string;
  type: string;
  ticketNumber: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

type NotificationListener = (notification: SocketNotification) => void;

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  unreadCount: number;
  resetUnreadCount: () => void;
  onNotification: (listener: NotificationListener) => () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  unreadCount: 0,
  resetUnreadCount: () => {},
  onNotification: () => () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────────

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Set<NotificationListener>>(new Set());

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const onNotification = useCallback((listener: NotificationListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Don't connect if no token is available
    if (!token) {
      // If socket exists from a previous session, disconnect it
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Fetch initial unread count from API
    fetch('/api/notifications?page=1', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const count = data?.unreadCount ?? data?.data?.unreadCount ?? 0;
        setUnreadCount(count);
      })
      .catch(() => {
        // Silently fail
      });

    // Create socket connection with auth token
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ─── Connection Events ────────────────────────────────────────────

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket.io] Connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket.io] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      console.error('[Socket.io] Connection error:', error.message);

      // Handle auth failures - if token is invalid/expired, clean up
      const errorData = (error as any)?.data;
      if (
        errorData?.code === 'UNAUTHORIZED' ||
        errorData?.code === 'TOKEN_EXPIRED' ||
        errorData?.code === 'INVALID_TOKEN'
      ) {
        console.warn('[Socket.io] Auth failed, disconnecting');
        socket.disconnect();
      }
    });

    // ─── Notification Events ──────────────────────────────────────────

    socket.on('notification', (notification: SocketNotification) => {
      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      toast({
        title: 'Notifikasi Baru',
        description: notification.message,
      });

      // Notify all registered listeners (e.g., notifications page)
      listenersRef.current.forEach((listener) => {
        try {
          listener(notification);
        } catch (err) {
          console.error('[Socket.io] Notification listener error:', err);
        }
      });
    });

    // ─── Cleanup on Unmount ───────────────────────────────────────────

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('notification');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  // Listen for storage events to detect logout from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token' && !event.newValue) {
        // Token was removed (logout) - disconnect socket
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setIsConnected(false);
          setUnreadCount(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
    unreadCount,
    resetUnreadCount,
    onNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
