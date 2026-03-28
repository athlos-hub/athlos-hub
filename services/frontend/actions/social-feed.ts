"use server";

import { Post, PageResponse } from "@/types/social";
import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SOCIAL_API_URL = process.env.API_BASE_URL || "http://localhost:8100/api";

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

export async function getPublicFeed(page: number = 0, size: number = 10): Promise<PageResponse<Post>> {
  try {
    const url = `${SOCIAL_API_URL}/social/feed/public?page=${page}&size=${size}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch public feed: ${response.status}`);
    }

    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw parseError;
    }
    
    const pageData = data.data || data;
    
    if (pageData.content) {
      return pageData;
    }
    
    if (Array.isArray(pageData)) {
      return {
        content: pageData,
        last: true,
        first: true,
        totalPages: 1,
        totalElements: pageData.length,
        size: pageData.length,
        number: 0,
      };
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
  } catch (error) {
    throw error;
  }
}
