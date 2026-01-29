"use client"

import { useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api/notifications';
import { useNotificationsSSE } from './use-notifications-sse';
import type { Notification, NotificationListResponse } from '@/types/notification';
import { useNotificationsStore } from '@/store/notifications';

let backgroundFetchTimeout: NodeJS.Timeout | null = null;
const BACKGROUND_FETCH_DEBOUNCE = 1000;

export function useNotifications(unreadOnlyInitial: boolean = false, autoRefresh: boolean = false, refreshInterval: number = 30000) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    setNotifications,
    setUnreadCount,
    setLoading,
    setError,
    showUnreadOnly,
    setShowUnreadOnly,
  } = useNotificationsStore();

  const unreadOnlyRef = useRef(unreadOnlyInitial);

  useEffect(() => {
    unreadOnlyRef.current = showUnreadOnly;
  }, [showUnreadOnly]);

  const fetchNotifications = async (
    unreadOnly: boolean = false,
    setGlobalFilter: boolean = true,
    background: boolean = false
  ) => {
    try {
      if (!background) {
        setLoading(true);
        setError(null);
      }
      const response: NotificationListResponse = await notificationsApi.getNotifications(1, 50, unreadOnly);
      setNotifications(response.items || []);
      if (setGlobalFilter) {
        setShowUnreadOnly(unreadOnly);
      }
    } catch (err: any) {
      if (!background) {
        const errorMessage = err.message || 'Erro ao buscar notificações';
        setError(errorMessage);
        setNotifications([]);
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
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
      useNotificationsStore.setState((state) => {
        const updated = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        );
        return {
          notifications: state.showUnreadOnly ? updated.filter((n) => !n.is_read) : updated,
          unreadCount: Math.max(0, state.unreadCount - 1),
        } as any;
      });

      await notificationsApi.markAsRead(notificationId);
    } catch (err: any) {
      await fetchNotifications(unreadOnlyInitial);
      await fetchUnreadCount();
    }
  };

  const markAllAsRead = async () => {
    try {
      useNotificationsStore.setState((state) => ({
        notifications: state.showUnreadOnly ? [] : state.notifications.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
        unreadCount: 0,
      } as any));

      await notificationsApi.markAllAsRead();
    } catch (err: any) {
      await fetchNotifications(unreadOnlyInitial);
      await fetchUnreadCount();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      useNotificationsStore.setState((state) => ({ notifications: state.notifications.filter((n) => n.id !== notificationId) } as any));
      await fetchUnreadCount();
    } catch (err: any) {
      throw err;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationsApi.clearAllNotifications();
      useNotificationsStore.setState({ notifications: [], unreadCount: 0 } as any);
    } catch (err: any) {
      throw err;
    }
  };

  const refresh = async () => {
    await fetchNotifications(unreadOnlyRef.current);
    await fetchUnreadCount();
  };

  const handleNewNotification = useCallback((notification: Notification) => {
    useNotificationsStore.setState((state) => {
      const currentUnreadOnly = state.showUnreadOnly;
      const exists = state.notifications.some(n => n.id === notification.id);

      if (exists) {
        const updated = state.notifications.map(n => n.id === notification.id ? notification : n);
        return { notifications: currentUnreadOnly && notification.is_read ? updated.filter(n => !n.is_read) : updated, unreadCount: state.unreadCount } as any;
      }

      if (currentUnreadOnly && notification.is_read) {
        return { notifications: state.notifications, unreadCount: state.unreadCount } as any;
      }

      return { notifications: [notification, ...state.notifications], unreadCount: state.unreadCount + (notification.is_read ? 0 : 1) } as any;
    });
  }, []);

  const handleUnreadCountUpdate = useCallback((count: number) => {
    setUnreadCount(count);
    
    if (backgroundFetchTimeout) {
      clearTimeout(backgroundFetchTimeout);
    }
    
    backgroundFetchTimeout = setTimeout(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      
      void fetchNotifications(true, false, true);
    }, BACKGROUND_FETCH_DEBOUNCE);
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
      if (backgroundFetchTimeout) {
        clearTimeout(backgroundFetchTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        
        fetchUnreadCount();
        if (showUnreadOnly) {
          fetchNotifications(true, false, true);
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, showUnreadOnly]);

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