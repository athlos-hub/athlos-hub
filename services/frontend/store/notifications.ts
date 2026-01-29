import { create } from 'zustand';
import type { Notification } from '@/types/notification';

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  showUnreadOnly: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowUnreadOnly: (show: boolean) => void;
};

export const useNotificationsStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: null,
  showUnreadOnly: true,
  setNotifications: (notifications: Notification[]) => set({ notifications }),
  setUnreadCount: (unreadCount: number) => set({ unreadCount }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setShowUnreadOnly: (show: boolean) => set({ showUnreadOnly: show }),
}));

export default useNotificationsStore;
