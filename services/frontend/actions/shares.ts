"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Post, PageResponse } from "@/types/social";

export interface Share {
  id: string;
  keycloakId: string;
  post: Post;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export type SharePage = PageResponse<Share>;

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function sharePost(postId: string, comment?: string): Promise<Share> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<Share>>({
    endpoint: `/social/shares/${postId}`,
    method: "POST",
    data: comment ? { comment } : {},
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as Share;
}

export async function unsharePost(postId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  await axiosAPI({
    endpoint: `/social/shares/${postId}`,
    method: "DELETE",
    withAuth: true,
    bearerToken: session.accessToken,
  });
}

export async function checkHasShared(postId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return false;
  }

  try {
    const response = await axiosAPI<ApiResponse<{ shared: boolean }>>({
      endpoint: `/social/shares/check/${postId}`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data.data?.shared ?? false;
  } catch {
    return false;
  }
}

export async function getMyShares(page: number = 0, size: number = 10): Promise<SharePage> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<SharePage>>({
    endpoint: `/social/shares/my?page=${page}&size=${size}`,
    method: "GET",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as SharePage;
}

export async function getUserShares(keycloakId: string, page: number = 0, size: number = 10): Promise<SharePage> {
  const session = await getServerSession(authOptions);
  
  const response = await axiosAPI<ApiResponse<SharePage>>({
    endpoint: `/social/shares/user/${keycloakId}?page=${page}&size=${size}`,
    method: "GET",
    withAuth: !!session?.accessToken,
    bearerToken: session?.accessToken,
  });

  return response.data.data || response.data as unknown as SharePage;
}

export async function getShareCount(postId: string): Promise<number> {
  const response = await axiosAPI<ApiResponse<{ count: number }>>({
    endpoint: `/social/shares/count/${postId}`,
    method: "GET",
    withAuth: false,
  });

  return response.data.data?.count ?? 0;
}
