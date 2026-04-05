"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface Follow {
  id: string;
  followerKeycloakId: string;
  followingKeycloakId: string;
  createdAt: string;
}

export interface FollowersPage {
  content: string[]; // Array de keycloak_ids
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface FollowingPage {
  content: string[]; // Array de keycloak_ids
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface FollowPage {
  content: Follow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function toggleFollow(targetKeycloakId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<{ following: boolean }>>({
    endpoint: `/social/follow/${targetKeycloakId}`,
    method: "POST",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data?.following ?? response.data.data as unknown as boolean;
}

export async function checkIsFollowing(targetKeycloakId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return false;
  }

  try {
    const response = await axiosAPI<ApiResponse<{ following: boolean }>>({
      endpoint: `/social/follow/check/${targetKeycloakId}`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data.data?.following ?? false;
  } catch {
    return false;
  }
}

export async function getFollowers(keycloakId: string, page: number = 0, size: number = 20): Promise<FollowersPage> {
  const session = await getServerSession(authOptions);
  
  const response = await axiosAPI<ApiResponse<FollowersPage>>({
    endpoint: `/social/follow/followers/${keycloakId}?page=${page}&size=${size}`,
    method: "GET",
    withAuth: !!session?.accessToken,
    bearerToken: session?.accessToken,
  });

  return response.data.data || response.data as unknown as FollowersPage;
}

export async function getFollowing(keycloakId: string, page: number = 0, size: number = 20): Promise<FollowingPage> {
  const session = await getServerSession(authOptions);
  
  const response = await axiosAPI<ApiResponse<FollowingPage>>({
    endpoint: `/social/follow/following/${keycloakId}?page=${page}&size=${size}`,
    method: "GET",
    withAuth: !!session?.accessToken,
    bearerToken: session?.accessToken,
  });

  return response.data.data || response.data as unknown as FollowingPage;
}

export interface OrganizationFollow {
  id: string;
  followerKeycloakId: string;
  organizationSlug: string;
  createdAt: string;
}

export interface OrganizationFollowPage {
  content: OrganizationFollow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function toggleFollowOrganization(organizationSlug: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<{ following: boolean }>>({
    endpoint: `/social/organization-follow/${organizationSlug}`,
    method: "POST",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data?.following ?? response.data.data as unknown as boolean;
}

export async function checkIsFollowingOrganization(organizationSlug: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return false;
  }

  try {
    const response = await axiosAPI<ApiResponse<{ following: boolean }>>({
      endpoint: `/social/organization-follow/check/${organizationSlug}`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data.data?.following ?? false;
  } catch {
    return false;
  }
}

export async function getOrganizationFollowersCount(organizationSlug: string): Promise<number> {
  try {
    const response = await axiosAPI<ApiResponse<{ count: number }>>({
      endpoint: `/social/organization-follow/count/${organizationSlug}`,
      method: "GET",
      withAuth: false,
    });

    return response.data.data?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getOrganizationFollowers(organizationSlug: string, page: number = 0, size: number = 20): Promise<OrganizationFollowPage> {
  const session = await getServerSession(authOptions);
  
  const response = await axiosAPI<ApiResponse<OrganizationFollowPage>>({
    endpoint: `/social/organization-follow/followers/${organizationSlug}?page=${page}&size=${size}`,
    method: "GET",
    withAuth: !!session?.accessToken,
    bearerToken: session?.accessToken,
  });

  return response.data.data || response.data as unknown as OrganizationFollowPage;
}

export async function getMyFollowedOrganizations(page: number = 0, size: number = 20): Promise<OrganizationFollowPage> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<OrganizationFollowPage>>({
    endpoint: `/social/organization-follow/my-organizations?page=${page}&size=${size}`,
    method: "GET",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as OrganizationFollowPage;
}
