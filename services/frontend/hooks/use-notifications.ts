"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api/notifications';
import { useNotificationsSSE } from './use-notifications-sse';
import type { Notification, NotificationListResponse } from '@/types/notification';

export function useNotifications(unreadOnlyInitial: boolean = false, autoRefresh: boolean = false, refreshInterval: number = 30000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(unreadOnlyInitial);
  const unreadOnlyRef = useRef(unreadOnlyInitial);
  
  useEffect(() => {
    unreadOnlyRef.current = unreadOnly;
  }, [unreadOnly]);

  const fetchNotifications = async (unreadOnly: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const response: NotificationListResponse = await notificationsApi.getNotifications(1, 50, unreadOnly);
      setNotifications(response.items || []);
      setUnreadOnly(unreadOnly);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar notificações';
      setError(errorMessage);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        );
        if (unreadOnly) {
          return updated.filter((n) => n.id !== notificationId || !n.is_read);
        }
        return updated;
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      await notificationsApi.markAsRead(notificationId);
    } catch (err: any) {
      await fetchNotifications(unreadOnly);
      await fetchUnreadCount();
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }));
        if (unreadOnly) {
          return [];
        }
        return updated;
      });
      setUnreadCount(0);
      
      await notificationsApi.markAllAsRead();
    } catch (err: any) {
      await fetchNotifications(unreadOnly);
      await fetchUnreadCount();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await fetchUnreadCount();
    } catch (err: any) {
      throw err;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationsApi.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err: any) {
      throw err;
    }
  };

  const refresh = async () => {
    await fetchNotifications(unreadOnly);
    await fetchUnreadCount();
  };

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      const currentUnreadOnly = unreadOnlyRef.current;
      const exists = prev.some(n => n.id === notification.id);
      
      if (exists) {
        const updated = prev.map(n => {
          if (n.id === notification.id) {
            return notification;
          }
          return n;
        });
        
        if (currentUnreadOnly && notification.is_read) {
          return updated.filter(n => n.id !== notification.id || !n.is_read);
        }
        return updated;
      }
      
      if (currentUnreadOnly && notification.is_read) {
        return prev;
      }
      
      return [notification, ...prev];
    });
  }, []);

  const handleUnreadCountUpdate = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  useNotificationsSSE({
    onNotification: handleNewNotification,
    onUnreadCountUpdate: handleUnreadCountUpdate,
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        if (isMounted) {
          await fetchNotifications(unreadOnlyInitial);
        }
        if (isMounted) {
          await fetchUnreadCount();
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refresh,
    fetchNotifications,
  };
}
