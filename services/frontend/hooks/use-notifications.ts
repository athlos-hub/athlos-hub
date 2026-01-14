"use client"

import { useState, useEffect } from 'react';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification, NotificationListResponse } from '@/types/notification';

export function useNotifications(unreadOnlyInitial: boolean = false, autoRefresh: boolean = false, refreshInterval: number = 30000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (unreadOnly: boolean = false) => {
    try {
      setLoading(true);
      const response: NotificationListResponse = await notificationsApi.getNotifications(1, 50, unreadOnly);
      setNotifications(response.items);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar notificações');
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Erro ao buscar contagem:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      await fetchUnreadCount();
    } catch (err: any) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const refresh = async () => {
    await fetchNotifications();
    await fetchUnreadCount();
  };

  useEffect(() => {
    fetchNotifications(unreadOnlyInitial);
    fetchUnreadCount();
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
    refresh,
    fetchNotifications,
  };
}
