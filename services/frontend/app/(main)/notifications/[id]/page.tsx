"use client"

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NotificationActions } from '@/components/notifications/notification-actions';
import {
  getNotificationDetailRows,
  shouldShowNotificationActions,
} from '@/lib/notifications/notification-detail-sections';
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
import { PageHeader } from '@/components/layout/page-header';

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
      
      const normalizedType = String(data.type).toLowerCase();
      const isActionablePendingType =
        normalizedType === 'organization_invite' ||
        normalizedType === 'organization_join_request';

      // Para notificações com decisão pendente, não marca como lida ao abrir.
      // Isso preserva o fluxo de ação (aceitar/recusar/aprovar/rejeitar).
      if (!data.is_read && !isActionablePendingType) {
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

  const formatTimeAgo = (dateString: string) => {
    try {
      // Normaliza espaço para 'T' e adiciona 'Z' apenas se não tiver timezone
      const normalized = dateString.trim().replace(' ', 'T');
      const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized);
      const iso = hasTimezone ? normalized : `${normalized}Z`;
  
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return 'agora';
  
      return formatDistanceToNow(date, {
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

  const messageText = notification.message?.trim() ?? '';
  const showMessage = messageText.length > 0;
  const detailRows = getNotificationDetailRows(notification.metadata);
  const showDetails = detailRows.length > 0;
  const showActions = shouldShowNotificationActions(notification);

  const sectionTitleClass =
    'mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

  return (
    <div className="mx-auto w-full space-y-6">
      <PageHeader
        title="Detalhes da notificação"
        subtitle="Visualize os detalhes da notificação"
        actions={
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deletando...' : 'Deletar notificação'}
          </Button>
        }
      />

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

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 border-b bg-muted/20">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <CardTitle className="mb-2 text-xl sm:text-2xl">{notification.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                {formatTimeAgo(notification.created_at)}
                {!notification.is_read && (
                  <div className="h-2.5 w-2.5 rounded-full bg-main" />
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {showMessage && (
            <div>
              <h3 className={sectionTitleClass}>Mensagem</h3>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm leading-relaxed text-foreground sm:text-base">{notification.message}</p>
              </div>
            </div>
          )}

          {showDetails && (
            <div>
              <h3 className={sectionTitleClass}>Detalhes</h3>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                {detailRows.map((row) => (
                  <div
                    key={`${row.label}-${row.value}`}
                    className="flex items-start justify-between gap-3 rounded-md bg-background px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{row.label}:</span>
                    <span className="text-right text-sm font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showActions && (
            <NotificationActions notification={notification} onComplete={() => router.push('/notifications')} />
          )}

          {!showMessage && !showDetails && !showActions && (
            <p className="text-sm text-muted-foreground">
              Não há conteúdo adicional para esta notificação.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
