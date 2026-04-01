"use client"

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IoMdNotificationsOutline } from "react-icons/io";
import { X, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Notification } from '@/types/notification';

const seenNotificationIds = new Set<string>();
const TOASTED_STORAGE_KEY = 'athlos_toasted_notification_ids';

function loadToastedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(TOASTED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveToastedIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOASTED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignora indisponibilidade de storage
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const persistedToastedIdsRef = useRef<Set<string>>(new Set());
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(
    true,
    false,
    30000,
    false,
    false
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.is_read),
    [notifications]
  );

  useEffect(() => {
    persistedToastedIdsRef.current = loadToastedIds();
  }, []);

  useEffect(() => {
    let changedPersistedIds = false;
    unreadNotifications.forEach(notification => {
      const alreadyToasted =
        seenNotificationIds.has(notification.id) ||
        persistedToastedIdsRef.current.has(notification.id);
      if (!alreadyToasted) {
        seenNotificationIds.add(notification.id);
        persistedToastedIdsRef.current.add(notification.id);
        changedPersistedIds = true;
        
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
          action: {
            label: 'Ver',
            onClick: () => {
              router.push(`/notifications/${notification.id}`);
            },
          },
        });
      }
    });
    if (changedPersistedIds) {
      saveToastedIds(persistedToastedIdsRef.current);
    }
    
    const currentIds = new Set(unreadNotifications.map(n => n.id));
    const idsToRemove: string[] = [];
    seenNotificationIds.forEach(id => {
      if (!currentIds.has(id)) {
        idsToRemove.push(id);
      }
    });
    idsToRemove.forEach(id => seenNotificationIds.delete(id));
  }, [unreadNotifications, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).closest('.mark-read-btn')) {
      e.stopPropagation();
      return;
    }

    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    setIsOpen(false);
    router.push(`/notifications/${notification.id}`);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    await markAsRead(notification.id);
    toast.success('Notificação marcada como lida');
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'agora';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <IoMdNotificationsOutline size={24} className="cursor-pointer text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col transition-all duration-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-main text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-main hover:text-main/80 font-medium px-2 py-1 hover:bg-main/10 rounded transition-colors"
                  title="Marcar todas como lidas"
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && unreadNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main mx-auto mb-2"></div>
                <p>Carregando...</p>
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <IoMdNotificationsOutline size={48} className="mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhuma notificação</p>
                <p className="text-sm mt-1">Você está em dia!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative p-4 hover:bg-gray-50 transition-all cursor-pointer ${
                      !notification.is_read ? 'bg-main/5 border-l-4 border-main' : 'border-l-4 border-transparent'
                    }`}
                    onClick={(e) => handleNotificationClick(notification, e)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`text-sm font-medium text-gray-900 ${
                            !notification.is_read ? 'font-semibold flex items-center gap-2' : ''
                          }`}>
                            <span>{notification.title}</span>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-main" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => handleMarkAsRead(e, notification)}
                                className="mark-read-btn opacity-0 group-hover:opacity-100 p-1 hover:bg-main/20 rounded transition-all"
                                title="Marcar como lida"
                              >
                                <Check className="w-3 h-3 text-main" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                          {notification.action_url && (
                            <span className="text-xs text-main font-medium">
                              Ver detalhes →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <Link
              href="/notifications"
              className="block text-center text-sm text-main hover:text-main/80 font-medium py-2 hover:bg-main/5 rounded transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Ver todas as notificações ({unreadNotifications.length})
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}