"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface LikeResponse {
  isLiked: boolean;
  likesCount: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function togglePostLike(postId: string): Promise<LikeResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<ApiResponse<LikeResponse>>({
      endpoint: `/social/posts/${postId}/like`,
      method: "POST",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    const result = response.data.data || response.data;
    return result as LikeResponse;
  } catch (error) {
    console.error("Failed to toggle like:", error);
    throw error;
  }
}

export async function getPostLikeStatus(postId: string): Promise<LikeResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<ApiResponse<LikeResponse>>({
      endpoint: `/social/posts/${postId}/like`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    const result = response.data.data || response.data;
    return result as LikeResponse;
  } catch (error) {
    console.error("Failed to get like status:", error);
    throw error;
  }
}
