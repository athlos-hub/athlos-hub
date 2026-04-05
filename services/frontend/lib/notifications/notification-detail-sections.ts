import type { Notification, NotificationMetadata } from '@/types/notification';

export type NotificationDetailRow = { label: string; value: string };

/** Campos de metadata que a UI de detalhes sabe exibir (evita seção vazia com chaves ignoradas). */
export function getNotificationDetailRows(
  metadata: NotificationMetadata | undefined
): NotificationDetailRow[] {
  if (!metadata) return [];
  const rows: NotificationDetailRow[] = [];
  const add = (label: string, v: unknown) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) rows.push({ label, value: s });
  };
  add('Organização', metadata.organization_name);
  add('Solicitante', metadata.requester_name);
  add('Membro', metadata.member_name);
  add('Convidado por', metadata.inviter_name);
  add('Competição', metadata.competition_name);
  add('Transmissão', metadata.livestream_title);
  // Notificações novas já trazem o excerto na mensagem; só repetimos aqui em legado (postContent sem postPreview).
  const legacyPost =
    typeof metadata.postContent === 'string' && metadata.postContent.trim() && !metadata.postPreview;
  if (legacyPost) {
    const pc = metadata.postContent.trim();
    add('Publicação', pc.length > 200 ? `${pc.slice(0, 200)}…` : pc);
  }
  add('Comentário dele(a)', metadata.commentPreview ?? metadata.commentContent);
  add('Texto ao compartilhar', metadata.shareComment);
  return rows;
}

export function resolveNotificationTargetHref(notification: Notification): string | null {
  const raw = notification.action_url?.trim();
  if (raw) {
    if (raw.startsWith('/')) return raw;
    try {
      const parsed = new URL(raw);
      if (parsed.pathname) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      /* ignore */
    }
  }
  const t = String(notification.type || '').toLowerCase();
  const postTypes = new Set(['post_like', 'post_comment', 'post_share', 'comment_reply']);
  const eid = notification.metadata?.entity_id;
  if (postTypes.has(t) && eid != null && String(eid).trim()) {
    return `/social/post/${String(eid).trim()}`;
  }
  if (notification.metadata?.organization_slug) {
    return `/organizations/${notification.metadata.organization_slug}`;
  }
  return null;
}

const NON_ACTIONABLE_INFORMATIVE_TYPES = new Set([
  'organization_request_rejected',
  'organization_member_removed',
  'organization_organizer_removed',
  'organization_invite_cancelled',
  'organization_invite_declined',
  'organization_ownership_transferred',
  'organization_deleted',
]);

export function isNotificationInformativeOnlyType(type: string): boolean {
  return NON_ACTIONABLE_INFORMATIVE_TYPES.has(String(type).toLowerCase());
}

/**
 * Painel de ações (com título "Ações") só para tipos em que há botões/links reais,
 * alinhado a {@link NotificationActions}.
 */
export function shouldShowNotificationActions(notification: Notification): boolean {
  if (notification.action_taken) return false;
  const notificationType = String(notification.type).toLowerCase();
  const href = resolveNotificationTargetHref(notification);

  let hasContent = false;
  switch (notificationType) {
    case 'organization_invite':
      hasContent = true;
      break;
    case 'organization_join_request':
      hasContent = !!(
        notification.metadata?.organization_slug && notification.metadata?.membership_id
      );
      break;
    case 'organization_request_approved':
    case 'organization_accepted':
    case 'organization_organizer_added':
    case 'organization_ownership_received':
    case 'organization_approved':
    case 'organization_member_left':
    case 'organization_suspended':
    case 'organization_unsuspended':
      hasContent = !!href;
      break;
    case 'organization_request_rejected':
    case 'organization_member_removed':
    case 'organization_organizer_removed':
    case 'organization_invite_cancelled':
    case 'organization_invite_declined':
    case 'organization_ownership_transferred':
    case 'organization_deleted':
      hasContent = true;
      break;
    default:
      hasContent = !!href;
  }

  if (!hasContent) return false;
  if (isNotificationInformativeOnlyType(notificationType)) return false;
  return true;
}
