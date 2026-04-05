"use server";

import { Post, PageResponse } from "@/types/social";
import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function getFollowingFeed(page: number = 0, size: number = 10): Promise<PageResponse<Post>> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<PageResponse<Post>>>({
    endpoint: `/social/feed/following?page=${page}&size=${size}`,
    method: "GET",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as PageResponse<Post>;
}

/**
 * Feed “Para você”: público para anônimos; logado inclui posts FOLLOWERS/MEMBERS_ONLY
 * de organizações e times dos quais o usuário é membro (ex.: org privada).
 */
export async function getPublicFeed(page: number = 0, size: number = 10): Promise<PageResponse<Post>> {
  const session = await getServerSession(authOptions);
  const authenticated = Boolean(session?.accessToken);

  const response = await axiosAPI<ApiResponse<PageResponse<Post>>>({
    endpoint: "/social/feed/public",
    method: "GET",
    queryParams: { page, size },
    withAuth: authenticated,
  });

  const body = response.data as ApiResponse<PageResponse<Post>> | PageResponse<Post>;
  const pageData =
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    body.success &&
    "data" in body
      ? body.data
      : (body as PageResponse<Post>);

  if (pageData?.content) {
    return pageData;
  }

  return {
    content: [],
    last: true,
    first: true,
    totalPages: 0,
    totalElements: 0,
    size: 0,
    number: 0,
  };
}
