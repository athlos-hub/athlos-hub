"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios, { AxiosError } from "axios";
import type { MatchDetail, MultipleMatchesDetailResponse } from "@/types/match";

const COMPETITIONS_API_URL = process.env.COMPETITIONS_API_URL || "http://localhost:8001/api/v1";

async function competitionsAPI<T>(
  endpoint: string,
  options?: {
    method?: string;
    data?: unknown;
    params?: Record<string, string | number | boolean>;
    requireAuth?: boolean;
  }
): Promise<T> {
  const session = await getServerSession(authOptions);

  const requireAuth = options?.requireAuth ?? false;
  if (requireAuth && !session?.accessToken) {
    throw new Error("Você precisa estar autenticado para realizar esta ação");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  try {
    const response = await axios<T>({
      baseURL: COMPETITIONS_API_URL,
      url: endpoint,
      method: options?.method || "GET",
      data: options?.data,
      params: options?.params,
      headers,
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; detail?: string }>;
    
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "Erro ao comunicar com o serviço de competições";
    throw new Error(message);
  }
}

export async function getMatchById(matchId: string): Promise<MatchDetail> {
  return competitionsAPI<MatchDetail>(`/matches/${matchId}`);
}

export async function getMatchesByIds(matchIds: string[]): Promise<MatchDetail[]> {
  const response = await competitionsAPI<MultipleMatchesDetailResponse>("/matches/batch", {
    method: "POST",
    data: matchIds,
  });
  return response.matches;
}