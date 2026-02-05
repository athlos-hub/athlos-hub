"use server";

import { axiosAPI } from "@/lib/api/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function toggleFollowTeam(teamId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const response = await axiosAPI<ApiResponse<{ following: boolean }>>({
    endpoint: `/social/team-follow/${teamId}`,
    method: "POST",
    withAuth: true,
    bearerToken: session.accessToken,
  });

  return response.data.data?.following ?? (response.data.data as unknown as boolean);
}

export async function checkIsFollowingTeam(teamId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return false;
  }

  try {
    const response = await axiosAPI<ApiResponse<{ following: boolean }>>({
      endpoint: `/social/team-follow/check/${teamId}`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data.data?.following ?? false;
  } catch {
    return false;
  }
}

export async function getTeamFollowersCount(teamId: string): Promise<number> {
  try {
    const response = await axiosAPI<ApiResponse<{ count: number }>>({
      endpoint: `/social/team-follow/count/${teamId}`,
      method: "GET",
      withAuth: false,
    });

    return response.data.data?.count ?? 0;
  } catch {
    return 0;
  }
}
