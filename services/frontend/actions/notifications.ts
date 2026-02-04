"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export enum NotificationType {
  POST_LIKE = "POST_LIKE",
  POST_COMMENT = "POST_COMMENT",
  POST_SHARE = "POST_SHARE",
  COMMENT_REPLY = "COMMENT_REPLY",
  FOLLOW = "FOLLOW",
  ORGANIZATION_FOLLOW = "ORGANIZATION_FOLLOW"
}

export interface Notification {
  id: string;
  recipientKeycloakId: string;
  actorKeycloakId: string;
  type: NotificationType;
  entityId: string;
  entityType: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPage {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function getNotifications(page: number = 0, size: number = 20): Promise<NotificationPage> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<NotificationPage>>({
    endpoint: `/social/notifications?page=${page}&size=${size}`,
    method: "GET",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as NotificationPage;
}

export async function getUnreadCount(): Promise<number> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return 0;
  }

  try {
    const response = await axiosAPI<ApiResponse<{ count: number }>>({
      endpoint: `/social/notifications/unread-count`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data.data?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  await axiosAPI({
    endpoint: `/social/notifications/${notificationId}/read`,
    method: "PUT",
    withAuth: true,
    bearerToken: session.accessToken,
  });
}

export async function markAllAsRead(): Promise<void> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  await axiosAPI({
    endpoint: `/social/notifications/read-all`,
    method: "PUT",
    withAuth: true,
    bearerToken: session.accessToken,
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  await axiosAPI({
    endpoint: `/social/notifications/${notificationId}`,
    method: "DELETE",
    withAuth: true,
    bearerToken: session.accessToken,
  });
}
