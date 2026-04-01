"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Notification } from '@/types/notification';
import { 
  acceptOrganizationInvite, 
  declineOrganizationInvite,
  approveJoinRequest,
  rejectJoinRequest,
} from '@/actions/organizations';
import { notificationsApi } from '@/lib/api/notifications';
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

interface NotificationActionsProps {
  notification: Notification;
  onComplete?: () => void;
}

export function NotificationActions({ notification, onComplete }: NotificationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionType, setActionType] = useState<'invite' | 'request' | null>(null);
  const notificationType = String(notification.type).toLowerCase();

  const resolveTargetHref = (): string | null => {
    const raw = notification.action_url?.trim();
    if (raw) {
      // Aceita path relativo absoluto do app
      if (raw.startsWith("/")) return raw;
      // Normaliza URL absoluta para path interno quando for mesmo domínio
      try {
        const parsed = new URL(raw);
        if (parsed.pathname) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        // ignora formato inválido e usa fallback
      }
    }
    if (notification.metadata?.organization_slug) {
      return `/organizations/${notification.metadata.organization_slug}`;
    }
    return null;
  };

  const navigateToTarget = () => {
    const href = resolveTargetHref();
    if (!href) {
      toast.error("Não foi possível abrir o destino desta notificação.");
      return;
    }
    router.push(href);
  };

  const handleAcceptInvite = async () => {
    if (!notification.metadata?.organization_slug) return;
    
    try {
      setLoading(true);
      const result = await acceptOrganizationInvite(notification.metadata.organization_slug);
      
      if (result.success) {
        toast.success('Convite aceito! Bem-vindo à organização.');
        await notificationsApi.markAsRead(notification.id, 'accepted');
        router.push(`/organizations/${notification.metadata.organization_slug}`);
      } else {
        toast.error(result.error || 'Erro ao aceitar convite');
      }
    } catch (error) {
      toast.error('Erro ao aceitar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!notification.metadata?.organization_slug) return;
    
    try {
      setLoading(true);
      const result = await declineOrganizationInvite(notification.metadata.organization_slug);
      
      if (result.success) {
        toast.success('Convite recusado');
        await notificationsApi.markAsRead(notification.id, 'declined');
        setShowRejectDialog(false);
        onComplete?.();
      } else {
        toast.error(result.error || 'Erro ao recusar convite');
      }
    } catch (error) {
      toast.error('Erro ao recusar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!notification.metadata?.organization_slug || !notification.metadata?.membership_id) return;
    try {
      setLoading(true);
      const result = await approveJoinRequest(
        notification.metadata.organization_slug,
        notification.metadata.membership_id
      );
      if (result.success) {
        toast.success('Solicitação aprovada!');
        await notificationsApi.markAsRead(notification.id, 'approved');
        onComplete?.();
      } else {
        toast.error(result.error || 'Erro ao aprovar solicitação');
      }
    } catch (error) {
      toast.error('Erro ao aprovar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!notification.metadata?.organization_slug || !notification.metadata?.membership_id) return;
    try {
      setLoading(true);
      const result = await rejectJoinRequest(
        notification.metadata.organization_slug,
        notification.metadata.membership_id
      );
      if (result.success) {
        toast.success('Solicitação rejeitada');
        await notificationsApi.markAsRead(notification.id, 'rejected');
        setShowRejectDialog(false);
        onComplete?.();
      } else {
        toast.error(result.error || 'Erro ao rejeitar solicitação');
      }
    } catch (error) {
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getActions = () => {
    switch (notificationType) {
      case 'organization_invite':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleAcceptInvite}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Processando...' : 'Aceitar Convite'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setActionType('invite');
                  setShowRejectDialog(true);
                }}
                disabled={loading}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                Recusar
              </Button>
            </div>
          </div>
        );

      case 'organization_join_request':
        if (notification.metadata?.organization_slug && notification.metadata?.membership_id) {
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleApproveRequest}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Processando...' : 'Aprovar Solicitação'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionType('request');
                    setShowRejectDialog(true);
                  }}
                  disabled={loading}
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  Rejeitar
                </Button>
              </div>
            </div>
          );
        }
        return null;

      case 'organization_request_approved':
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Ir para Organização
            </Button>
          );
        }
        return null;

      case 'organization_accepted':
      case 'organization_organizer_added':
      case 'organization_ownership_received':
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full"
            >
              Ver Organização
            </Button>
          );
        }
        return null;

      case 'organization_approved':
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Acessar Organização Aprovada
            </Button>
          );
        }
        return null;

      case 'organization_member_left':
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full" 
              variant="outline"
            >
              Ver Membros da Organização
            </Button>
          );
        }
        return null;

      case 'organization_suspended':
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full"
              variant="outline"
            >
              Ver Status da Organização
            </Button>
          );
        }
        return null;

      case 'organization_unsuspended':
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Acessar Organização
            </Button>
          );
        }
        return null;

      case 'organization_request_rejected':
      case 'organization_member_removed':
      case 'organization_organizer_removed':
      case 'organization_invite_cancelled':
      case 'organization_invite_declined':
      case 'organization_ownership_transferred':
      case 'organization_deleted':
        return (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">Esta notificação é apenas informativa</p>
          </div>
        );

      default:
        if (resolveTargetHref()) {
          return (
            <Button 
              onClick={navigateToTarget}
              className="w-full"
            >
              Ver Detalhes
            </Button>
          );
        }
        return null;
    }
  };

  const actions = getActions();

  if (notification.action_taken) {
    return null;
  }

  if (!actions) {
    return null;
  }

  const isActionableType =
    notificationType !== 'organization_request_rejected'
    && notificationType !== 'organization_member_removed'
    && notificationType !== 'organization_organizer_removed'
    && notificationType !== 'organization_invite_cancelled'
    && notificationType !== 'organization_invite_declined'
    && notificationType !== 'organization_ownership_transferred'
    && notificationType !== 'organization_deleted';

  return (
    isActionableType && !notification.action_taken && (
      <>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Ações</h3>
          {actions}
        </div>
  
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'invite' ? 'Recusar convite?' : 'Rejeitar solicitação?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === 'invite' 
                  ? 'Você tem certeza que deseja recusar este convite? Esta ação não pode ser desfeita.'
                  : 'Você tem certeza que deseja rejeitar esta solicitação? O usuário será notificado.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={actionType === 'invite' ? handleDeclineInvite : handleRejectRequest}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Processando...' : (actionType === 'invite' ? 'Recusar' : 'Rejeitar')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  );
}
