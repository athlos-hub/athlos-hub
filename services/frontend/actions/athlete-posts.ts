"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Post } from "@/types/social";

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
}

export interface CreateAthletePostRequest {
  content: string;
  mediaUrls?: string[];
  type?: "TEXT" | "IMAGE" | "VIDEO" | "ACHIEVEMENT" | "EVENT" | "TRAINING" | "ANNOUNCEMENT";
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  metadata?: Record<string, any>;
}

export async function createAthletePost(request: CreateAthletePostRequest): Promise<Post> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<Post>>({
    endpoint: "/social/athlete/posts",
    method: "POST",
    data: request as unknown as Record<string, unknown>,
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as Post;
}

export async function getMyAthletePosts(page: number = 0, size: number = 10): Promise<PageResponse<Post>> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<PageResponse<Post>>>({
    endpoint: "/social/athlete/posts/my-posts",
    method: "GET",
    queryParams: { page, size },
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as PageResponse<Post>;
}

export async function getAthletePostsByKeycloakId(
  keycloakId: string,
  page: number = 0,
  size: number = 10
): Promise<PageResponse<Post>> {
  const response = await axiosAPI<ApiResponse<PageResponse<Post>>>({
    endpoint: `/social/athlete/posts/${keycloakId}`,
    method: "GET",
    queryParams: { page, size },
    withAuth: false,
  });

  return response.data.data || response.data as unknown as PageResponse<Post>;
}

export async function deleteAthletePost(postId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  await axiosAPI({
    endpoint: `/social/athlete/posts/${postId}`,
    method: "DELETE",
    withAuth: true,
    bearerToken: session.accessToken,
  });
}

export async function sharePost(
  postId: string,
  shareContent?: string
): Promise<Post> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const request: CreateAthletePostRequest = {
    content: shareContent || "",
  };

  const response = await axiosAPI<ApiResponse<Post>>({
    endpoint: `/social/athlete/posts/${postId}/share`,
    method: "POST",
    data: request as unknown as Record<string, unknown>,
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as Post;
}
