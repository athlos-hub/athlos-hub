"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Post } from "@/types/social";

export async function createOrganizationPost(
  organizationSlug: string,
  content: string,
  mediaUrls?: string[],
  metadata?: Record<string, any>
): Promise<Post> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<Post>({
      endpoint: `/social/organizations/${organizationSlug}/posts`,
      method: "POST",
      data: { content, mediaUrls, metadata },
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
  metadata?: Record<string, any>
): Promise<Post> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error("Usuário não autenticado");
    }

    const response = await axiosAPI<Post>({
      endpoint: `/social/teams/${teamId}/posts`,
      method: "POST",
      data: { content, mediaUrls, metadata },
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to create team post:", error);
    throw error;
  }
}
