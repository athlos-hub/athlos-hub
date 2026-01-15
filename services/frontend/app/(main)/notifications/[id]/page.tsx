"use client"

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NotificationActions } from '@/components/notifications/notification-actions';
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

interface NotificationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function NotificationDetailPage({ params }: NotificationDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchNotification();
  }, [resolvedParams.id]);

  const fetchNotification = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getNotification(resolvedParams.id);
      setNotification(data);
      
      if (!data.is_read) {
        await notificationsApi.markAsRead(resolvedParams.id);
        setNotification({ ...data, is_read: true, read_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Erro ao buscar notificação:', error);
      toast.error('Erro ao carregar notificação');
      router.push('/notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!notification) return;
    
    try {
      setDeleting(true);
      await notificationsApi.deleteNotification(notification.id);
      toast.success('Notificação deletada');
      setShowDeleteDialog(false);
      router.push('/notifications');
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      toast.error('Erro ao deletar notificação');
    } finally {
      setDeleting(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'organization_invite':
        return '🏢';
      case 'organization_accepted':
        return '✅';
      case 'organization_join_request':
        return '📥';
      case 'organization_request_approved':
        return '🎉';
      case 'organization_request_rejected':
        return '❌';
      case 'organization_member_removed':
        return '🚪';
      case 'organization_member_left':
        return '👋';
      case 'organization_organizer_added':
        return '⭐';
      case 'organization_organizer_removed':
        return '📉';
      case 'organization_invite_cancelled':
        return '🚫';
      case 'organization_invite_declined':
        return '👎';
      case 'organization_ownership_received':
        return '👑';
      case 'organization_ownership_transferred':
        return '🔄';
      case 'organization_approved':
        return '✨';
      case 'organization_suspended':
        return '⛔';
      case 'organization_unsuspended':
        return '🟢';
      case 'organization_deleted':
        return '🗑️';
      case 'general':
        return '🔔';
      default:
        return '🔔';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main"></div>
      </div>
    );
  }

  if (!notification) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleting}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deletando...' : 'Deletar'}
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar notificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Esta notificação será permanentemente deletada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="text-4xl">{getNotificationIcon(notification.type)}</div>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{notification.title}</CardTitle>
              <CardDescription className="text-base">
                {formatTimeAgo(notification.created_at)}
                {!notification.is_read && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-main/10 text-main">
                    Nova
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Mensagem</h3>
            <p className="text-base text-gray-900">{notification.message}</p>
          </div>

          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Detalhes</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {notification.metadata.organization_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Organização:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {notification.metadata.organization_name}
                    </span>
                  </div>
                )}
                {notification.metadata.requester_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Solicitante:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {notification.metadata.requester_name}
                    </span>
                  </div>
                )}
                {notification.metadata.member_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Membro:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {notification.metadata.member_name}
                    </span>
                  </div>
                )}
                {notification.metadata.inviter_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Convidado por:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {notification.metadata.inviter_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <NotificationActions notification={notification} onComplete={() => router.push('/notifications')} />
        </CardContent>
      </Card>
    </div>
  );
}
