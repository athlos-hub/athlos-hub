export enum NotificationType {
  ORGANIZATION_INVITE = 'organization_invite',
  ORGANIZATION_ACCEPTED = 'organization_accepted',
  
  ORGANIZATION_JOIN_REQUEST = 'organization_join_request',
  ORGANIZATION_REQUEST_APPROVED = 'organization_request_approved',
  ORGANIZATION_REQUEST_REJECTED = 'organization_request_rejected',
  
  ORGANIZATION_MEMBER_REMOVED = 'organization_member_removed',
  ORGANIZATION_MEMBER_LEFT = 'organization_member_left',
  ORGANIZATION_ORGANIZER_ADDED = 'organization_organizer_added',
  ORGANIZATION_ORGANIZER_REMOVED = 'organization_organizer_removed',
  
  GENERAL = 'general',
}

export interface NotificationMetadata {
  organization_id?: string;
  organization_name?: string;
  inviter_name?: string;
  member_name?: string;
  competition_id?: string;
  competition_name?: string;
  livestream_id?: string;
  livestream_title?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UnreadCountResponse {
  count: number;
}
