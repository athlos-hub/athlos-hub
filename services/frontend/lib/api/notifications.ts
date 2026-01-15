// API de notificações - Client-side
import axios from 'axios';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notification';

const API_BASE = '/api/notifications';

export const notificationsApi = {
  async getNotifications(
    page: number = 1,
    pageSize: number = 50,
    unreadOnly: boolean = false
  ): Promise<NotificationListResponse> {
    const response = await axios.get(API_BASE, {
      params: { 
        page, 
        page_size: pageSize, 
        unread_only: unreadOnly 
      },
    });
    return response.data;
  },

  async getNotification(notificationId: string): Promise<Notification> {
    const response = await axios.get(`${API_BASE}/${notificationId}`);
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await axios.post(`${API_BASE}/${notificationId}/mark-read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ message: string }> {
    const response = await axios.post(`${API_BASE}/mark-all-read`);
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await axios.get<UnreadCountResponse>(`${API_BASE}/unread-count`);
    return response.data.count;
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await axios.delete(`${API_BASE}/${notificationId}`);
  },

  async clearAllNotifications(): Promise<{ message: string }> {
    const response = await axios.delete(`${API_BASE}/clear-all`);
    return response.data;
  },
};
