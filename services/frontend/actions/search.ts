"use server";

import { axiosAPI } from "@/lib/api/client";
import { Post, PageResponse } from "@/types/social";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export type PostPage = PageResponse<Post>;

export async function searchPosts(query: string, page: number = 0, size: number = 20): Promise<PostPage> {
  const response = await axiosAPI<ApiResponse<PostPage>>({
    endpoint: `/social/search/posts?query=${encodeURIComponent(query)}&page=${page}&size=${size}`,
    method: "GET",
    withAuth: false,
  });

  return response.data.data || response.data as unknown as PostPage;
}

export async function getPopularPosts(days: number = 7, page: number = 0, size: number = 20): Promise<PostPage> {
  const response = await axiosAPI<ApiResponse<PostPage>>({
    endpoint: `/social/search/popular?days=${days}&page=${page}&size=${size}`,
    method: "GET",
    withAuth: false,
  });

  return response.data.data || response.data as unknown as PostPage;
}

export async function getTrendingPosts(page: number = 0, size: number = 20): Promise<PostPage> {
  const response = await axiosAPI<ApiResponse<PostPage>>({
    endpoint: `/social/search/trending?page=${page}&size=${size}`,
    method: "GET",
    withAuth: false,
  });

  return response.data.data || response.data as unknown as PostPage;
}
