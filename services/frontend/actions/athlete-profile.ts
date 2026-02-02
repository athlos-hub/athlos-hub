"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AthleteProfile {
  id: string;
  keycloakId: string;
  bio?: string;
  specialization?: string;
  city?: string;
  state?: string;
  country?: string;
  achievements?: Record<string, any>;
  statistics?: Record<string, any>;
  socialLinks?: Record<string, string>;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  achievementsCount: number;
  isPublic: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function getMyAthleteProfile(): Promise<AthleteProfile> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<AthleteProfile>>({
    endpoint: "/social/profile/me",
    method: "GET",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as AthleteProfile;
}

// Alias para getMyAthleteProfile - o endpoint /me já cria o perfil se não existir
export async function getOrCreateAthleteProfile(): Promise<AthleteProfile> {
  return getMyAthleteProfile();
}

export async function getAthleteProfileByKeycloakId(keycloakId: string): Promise<AthleteProfile> {
  const response = await axiosAPI<ApiResponse<AthleteProfile>>({
    endpoint: `/social/profile/${keycloakId}`,
    method: "GET",
    withAuth: false,
  });

  return response.data.data || response.data as unknown as AthleteProfile;
}

export async function updateAthleteProfile(updates: Partial<AthleteProfile>): Promise<AthleteProfile> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<AthleteProfile>>({
    endpoint: "/social/profile/me",
    method: "PUT",
    data: updates,
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as AthleteProfile;
}

export async function updateBio(bio: string): Promise<AthleteProfile> {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<AthleteProfile>>({
    endpoint: "/social/profile/me/bio",
    method: "PUT",
    data: { bio },
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data || response.data as unknown as AthleteProfile;
}
