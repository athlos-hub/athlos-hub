"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface CommentResponse {
  id: string;
  keycloakId: string;
  content: string;
  likesCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export async function createComment(postId: string, content: string): Promise<CommentResponse> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<CommentResponse>>({
    endpoint: `/social/posts/${postId}/comments`,
    method: "POST",
    data: { content },
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as CommentResponse;
}

export async function getComments(
  postId: string,
  page: number = 0,
  size: number = 20
): Promise<PageResponse<CommentResponse>> {
  const response = await axiosAPI<ApiResponse<PageResponse<CommentResponse>>>({
    endpoint: `/social/posts/${postId}/comments`,
    method: "GET",
    queryParams: { page, size },
    withAuth: false,
  });

  return response.data.data || response.data as unknown as PageResponse<CommentResponse>;
}

export async function updateComment(
  postId: string,
  commentId: string,
  content: string
): Promise<CommentResponse> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<CommentResponse>>({
    endpoint: `/social/posts/${postId}/comments/${commentId}`,
    method: "PUT",
    data: { content },
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as CommentResponse;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  await axiosAPI({
    endpoint: `/social/posts/${postId}/comments/${commentId}`,
    method: "DELETE",
    withAuth: true,
    bearerToken: session.accessToken,
  });
}
