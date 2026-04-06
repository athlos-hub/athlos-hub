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
    endpoint: `/social/search/posts?q=${encodeURIComponent(query)}&page=${page}&size=${size}`,
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

export interface Organization {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  privacy: "PUBLIC" | "PRIVATE";
  created_at: string;
}

export interface User {
  id: string;
  keycloak_id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface Team {
  id: string;
  organization_slug: string;
  organization_name: string;
  competition_id: string;
  competition_name: string;
  name: string;
  abbreviation: string;
  logo_url: string | null;
  status: string;
  player_count: number;
  member_count?: number;
  created_at: string;
}

export async function searchOrganizations(query: string, limit: number = 100): Promise<Organization[]> {
  try {
    const response = await axiosAPI<Organization[]>({
      endpoint: `/organizations?privacy=PUBLIC&limit=${limit}&offset=0`,
      method: "GET",
      withAuth: false,
    });

    // O endpoint pode retornar a lista diretamente ou envolvida em ApiResponse
    const organizations = Array.isArray(response.data) 
      ? response.data 
      : (response.data as any)?.data || [];
    
    // Filtrar localmente por query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      return organizations.filter((org: any) =>
        org.name.toLowerCase().includes(lowerQuery) ||
        org.slug.toLowerCase().includes(lowerQuery) ||
        (org.description?.toLowerCase() ?? "").includes(lowerQuery)
      );
    }
    
    return organizations;
  } catch (error) {
    console.error("Error searching organizations:", error);
    return [];
  }
}

export async function searchUsers(query: string): Promise<User[]> {
  try {
    const response = await axiosAPI<User[]>({
      endpoint: `/users/`,
      method: "GET",
      withAuth: false, // Endpoint é público
    });

    // O endpoint retorna a lista diretamente
    const users = Array.isArray(response.data) ? response.data : [];
    
    // Filtrar localmente por query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      return users.filter(user =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.username.toLowerCase().startsWith(lowerQuery) ||
        (user.first_name?.toLowerCase() ?? "").includes(lowerQuery) ||
        (user.first_name?.toLowerCase() ?? "").startsWith(lowerQuery) ||
        (user.last_name?.toLowerCase() ?? "").includes(lowerQuery) ||
        (user.last_name?.toLowerCase() ?? "").startsWith(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
      );
    }
    
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

export async function searchTeams(query: string, organizationSlug?: string): Promise<Team[]> {
  try {
    let endpoint = "/teams/organization";
    
    if (organizationSlug) {
      endpoint += `/${organizationSlug}`;
    }
    
    const response = await axiosAPI<Team[]>({
      endpoint,
      method: "GET",
      withAuth: false,
    });

    // O endpoint pode retornar a lista diretamente ou envolvida em ApiResponse
    const teams = Array.isArray(response.data) 
      ? response.data 
      : (response.data as any)?.data || [];
    
    // Filtrar localmente por query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      return teams.filter((team: any) =>
        team.name.toLowerCase().includes(lowerQuery) ||
        team.abbreviation.toLowerCase().includes(lowerQuery) ||
        team.organization_name.toLowerCase().includes(lowerQuery)
      );
    }
    
    return teams;
  } catch (error) {
    console.error("Error searching teams:", error);
    return [];
  }
}
