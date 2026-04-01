"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
import { useNotificationsStore } from '@/store/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Notification } from '@/types/notification';
import { Bell, Check, Filter, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { FilterPanel } from '@/components/layout/filter-panel';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAllNotifications, fetchNotifications } =
    useNotifications(true, false, 30000, false, false);
  
  const showUnreadOnly = useNotificationsStore((state) => state.showUnreadOnly);

  const handleFilterChange = async (unreadOnly: boolean) => {
    await fetchNotifications(unreadOnly, true);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    router.push(`/notifications/${notification.id}`);
  };

  const handleClearAll = async () => {
    try {
      setClearing(true);
      await clearAllNotifications();
      toast.success('Todas as notificações foram deletadas');
      setShowClearDialog(false);
    } catch (error) {
      toast.error('Erro ao deletar notificações');
    } finally {
      setClearing(false);
    }
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
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        subtitle={
          unreadCount > 0
            ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
            : 'Nenhuma notificação não lida'
        }
        actions={
          <>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 bg-main hover:bg-main/90 text-white"
              >
                <Check className="w-4 h-4" />
                Marcar todas como lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                disabled={clearing}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar tudo
              </Button>
            )}
          </>
        }
      />

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar todas as notificações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as suas notificações serão permanentemente deletadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={clearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {clearing ? 'Deletando...' : 'Deletar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilterPanel icon={<Filter className="w-5 h-5 text-gray-600" />}>
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showUnreadOnly
                ? 'bg-main text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Não lidas ({unreadCount})
          </button>
          <button
            onClick={() => handleFilterChange(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showUnreadOnly
                ? 'bg-main text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
        </div>
      </FilterPanel>

      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-main mx-auto"></div>
            <p className="text-gray-600 mt-4 font-medium">Carregando notificações...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {showUnreadOnly ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
            </h3>
            <p className="text-gray-600">
              {showUnreadOnly
                ? 'Você está em dia com suas notificações!'
                : 'Você ainda não recebeu nenhuma notificação.'}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-all cursor-pointer ${
                !notification.is_read 
                  ? 'border-main border-l-4' 
                  : 'border-gray-200'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className={`text-lg font-semibold text-gray-900 ${
                      !notification.is_read ? 'font-bold' : ''
                    }`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <div className="h-2.5 w-2.5 rounded-full bg-main" />
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">
                    {notification.message}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-main">
                    Ver detalhes →
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}