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

/** API devolve isLiked/likesCount; versões antigas usavam só `liked`. */
function parseLikePayload(raw: unknown): LikeResponse {
  if (!raw || typeof raw !== "object") {
    return { isLiked: false, likesCount: 0 };
  }
  const d = raw as Record<string, unknown>;
  const isLiked = Boolean(d.isLiked ?? d.liked);
  const lc = d.likesCount ?? d.likes_count;
  const likesCount =
    typeof lc === "number" && Number.isFinite(lc) ? lc : 0;
  return { isLiked, likesCount };
}

export async function togglePostLike(postId: string): Promise<LikeResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<ApiResponse<Record<string, unknown>>>({
      endpoint: `/social/posts/${postId}/like`,
      method: "POST",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    const payload = response.data.data ?? response.data;
    return parseLikePayload(payload);
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

    const response = await axiosAPI<ApiResponse<Record<string, unknown>>>({
      endpoint: `/social/posts/${postId}/like`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    const payload = response.data.data ?? response.data;
    return parseLikePayload(payload);
  } catch (error) {
    console.error("Failed to get like status:", error);
    throw error;
  }
}
