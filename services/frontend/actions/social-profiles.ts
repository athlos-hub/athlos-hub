"use server";
import { axiosAPI } from "@/lib/api/client";

export interface OrganizationProfile {
  id: string;
  organizationSlug: string;
  bio?: string;
  isPrivate: boolean;
  followersCount: number;
  postsCount: number;
  achievementsCount: number;
  achievements?: any[];
  socialLinks?: any;
  /** Perfil visível no social (organização aprovada na plataforma). */
  approvedForSocial?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamProfile {
  id: string;
  teamId: string;
  organizationSlug: string;
  description?: string;
  isPrivate: boolean;
  followersCount: number;
  postsCount: number;
  achievementsCount: number;
  achievements?: any[];
  socialLinks?: any;
  /** Perfil visível no social (equipe consolidada/aprovada na competição). */
  approvedForSocial?: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getOrganizationProfile(slug: string): Promise<OrganizationProfile | null> {
  try {
    const response = await axiosAPI<{ success: boolean; data: OrganizationProfile }>({
      endpoint: `/social/organization-profiles/${slug}`,
      method: "GET",
      withAuth: false,
    });
    const profile = response.data?.data ?? null;
    return profile;
  } catch (error) {
    return null;
  }
}


export async function getOrganizationProfileFresh(slug: string): Promise<OrganizationProfile | null> {
  try {
    console.log('🔍 Fetching organization profile (FRESH) for:', slug);
    const endpoint = `/social/organization-profiles/${slug}?_t=${Date.now()}`;
    
    const response = await axiosAPI<{ success: boolean; data: OrganizationProfile }>({
      endpoint,
      method: "GET",
      withAuth: false,
    });
    
    const profile = response.data?.data ?? null;
    return profile;
  } catch (error) {
    return null;
  }
}

export async function getTeamProfile(teamId: string): Promise<TeamProfile | null> {
  try {
    const response = await axiosAPI<{ success: boolean; data: TeamProfile }>({
      endpoint: `/social/team-profiles/${teamId}`,
      method: "GET",
      withAuth: false,
    });
    return response.data?.data ?? null;
  } catch (error) {
    return null;
  }
}