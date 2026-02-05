"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Post, PostType, PostVisibility } from "@/types/social";

export async function createOrganizationPost(
  organizationSlug: string,
  content: string,
  mediaUrls?: string[],
  metadata?: Record<string, any>,
  type?: PostType,
  visibility?: PostVisibility
): Promise<Post> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<Post>({
      endpoint: `/social/organizations/${organizationSlug}/posts`,
      method: "POST",
      data: { 
        content, 
        mediaUrls, 
        metadata,
        type: type || PostType.TEXT,
        visibility: visibility || PostVisibility.PUBLIC
      },
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to create organization post:", error);
    throw error;
  }
}

export async function createTeamPost(
  teamId: string,
  content: string,
  mediaUrls?: string[],
  metadata?: Record<string, any>,
  type?: PostType,
  visibility?: PostVisibility
): Promise<Post> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<Post>({
      endpoint: `/social/teams/${teamId}/posts`,
      method: "POST",
      data: { 
        content, 
        mediaUrls, 
        metadata,
        type: type || PostType.TEXT,
        visibility: visibility || PostVisibility.PUBLIC
      },
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to create team post:", error);
    throw error;
  }
}

export async function getOrganizationPosts(
  organizationSlug: string,
  page: number = 0,
  size: number = 10
): Promise<{ content: Post[]; totalPages: number; totalElements: number }> {
  try {
    const session = await getServerSession(authOptions);

    const response = await axiosAPI<{ 
      success: boolean;
      data: { 
        content: Post[]; 
        totalPages: number; 
        totalElements: number;
      };
    }>({
      endpoint: `/social/organizations/${organizationSlug}/posts?page=${page}&size=${size}`,
      method: "GET",
      withAuth: !!session?.accessToken,
      bearerToken: session?.accessToken,
    });

    return response.data.data;
  } catch (error) {
    console.error("Failed to get organization posts:", error);
    throw error;
  }
}

export async function getTeamPosts(
  teamId: string,
  page: number = 0,
  size: number = 10
): Promise<{ content: Post[]; totalPages: number; totalElements: number }> {
  try {
    const session = await getServerSession(authOptions);

    const response = await axiosAPI<{ 
      success: boolean;
      data: { 
        content: Post[]; 
        totalPages: number; 
        totalElements: number;
      };
    }>({
      endpoint: `/social/teams/${teamId}/posts?page=${page}&size=${size}`,
      method: "GET",
      withAuth: !!session?.accessToken,
      bearerToken: session?.accessToken,
    });

    return response.data.data;
  } catch (error) {
    console.error("Failed to get team posts:", error);
    throw error;
  }
}
