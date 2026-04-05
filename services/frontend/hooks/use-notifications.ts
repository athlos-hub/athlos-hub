"use client";

import { useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api/notifications';
import { useUnreadCountSse } from '@/hooks/use-unread-count-sse';
import type { Notification, NotificationListResponse } from '@/types/notification';
import { useNotificationsStore } from '@/store/notifications';
import { useSession } from 'next-auth/react';

let backgroundFetchTimeout: NodeJS.Timeout | null = null;
const BACKGROUND_FETCH_DEBOUNCE = 1000;

export function useNotifications(
  unreadOnlyInitial: boolean = false,
  autoRefresh: boolean = false,
  refreshInterval: number = 30000,
  enableInitialFetch: boolean = true,
  enableSse: boolean = true
) {
  const { status: sessionStatus } = useSession();
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
  const lastSseCountRef = useRef<number | null>(null);

  useEffect(() => {
    unreadOnlyRef.current = showUnreadOnly;
  }, [showUnreadOnly]);

  const fetchNotifications = useCallback(
    async (unreadOnly: boolean = false, setGlobalFilter: boolean = true, background: boolean = false) => {
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
      } catch (err: unknown) {
        if (!background) {
          const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar notificações';
          setError(errorMessage);
          setNotifications([]);
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [setError, setLoading, setNotifications, setShowUnreadOnly]
  );

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
      lastSseCountRef.current = count;
    } catch {
      /* silencioso */
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
        };
      });

      await notificationsApi.markAsRead(notificationId);
    } catch {
      await fetchNotifications(unreadOnlyInitial);
      await fetchUnreadCount();
    }
  };

  const markAllAsRead = async () => {
    try {
      useNotificationsStore.setState((state) => ({
        notifications: state.showUnreadOnly
          ? []
          : state.notifications.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
        unreadCount: 0,
      }));

      await notificationsApi.markAllAsRead();
    } catch {
      await fetchNotifications(unreadOnlyInitial);
      await fetchUnreadCount();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      useNotificationsStore.setState((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
      }));
      await fetchUnreadCount();
    } catch (err) {
      throw err;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationsApi.clearAllNotifications();
      useNotificationsStore.setState({ notifications: [], unreadCount: 0 });
    } catch (err) {
      throw err;
    }
  };

  const refresh = async () => {
    await fetchNotifications(unreadOnlyRef.current);
    await fetchUnreadCount();
  };

  const handleUnreadCountUpdate = useCallback(
    (count: number) => {
      const prev = lastSseCountRef.current;
      lastSseCountRef.current = count;
      setUnreadCount(count);

      // Primeiro evento: carga inicial já buscou a lista; reconexão com mesmo count não precisa refetch.
      if (prev === null || prev === count) {
        return;
      }

      if (backgroundFetchTimeout) {
        clearTimeout(backgroundFetchTimeout);
      }

      backgroundFetchTimeout = setTimeout(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        void fetchNotifications(unreadOnlyRef.current, false, true);
      }, BACKGROUND_FETCH_DEBOUNCE);
    },
    [setUnreadCount, fetchNotifications]
  );

  useUnreadCountSse({
    onCount: handleUnreadCountUpdate,
    onError: (err) => setError(err.message),
    enabled: enableSse,
  });

  useEffect(() => {
    if (!enableInitialFetch) {
      return;
    }
    if (sessionStatus !== 'authenticated') {
      return;
    }
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        if (isMounted) {
          await fetchNotifications(unreadOnlyInitial);
        }
        if (isMounted) {
          await fetchUnreadCount();
        }
      } catch {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
      if (backgroundFetchTimeout) {
        clearTimeout(backgroundFetchTimeout);
      }
    };
  }, [enableInitialFetch, sessionStatus, unreadOnlyInitial, fetchNotifications]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }

        void fetchUnreadCount();
        if (showUnreadOnly) {
          void fetchNotifications(true, false, true);
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
