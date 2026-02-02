"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Post, PostPage } from "@/types/social";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function getPublicFeed(page: number = 0, size: number = 10): Promise<PostPage> {
  const session = await getServerSession(authOptions);

  const response = await axiosAPI<ApiResponse<PostPage>>({
    endpoint: `/social/feed/public?page=${page}&size=${size}`,
    method: "GET",
    withAuth: !!session?.accessToken,
    bearerToken: session?.accessToken,
  });

  return response.data.data || response.data as unknown as PostPage;
}

export async function getFollowingFeed(page: number = 0, size: number = 10): Promise<PostPage> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<PostPage>>({
    endpoint: `/social/feed/following?page=${page}&size=${size}`,
    method: "GET",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as PostPage;
}
