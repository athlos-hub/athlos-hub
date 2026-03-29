"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios, { AxiosError } from "axios";
import type { MatchDetail, MultipleMatchesDetailResponse } from "@/types/match";
import type { 
  StatsRuleSet, 
  TeamWithPlayers, 
  RegisterScoreRequest, 
  MatchScoreResponse 
} from "@/types/stats";

const COMPETITIONS_API_URL = process.env.COMPETITIONS_API_URL || "http://localhost:8100/api";

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

/**
 * Busca os stats types (métricas) disponíveis para uma competição
 */
export async function getCompetitionStatsTypes(competitionId: number): Promise<StatsRuleSet | null> {
  try {
    return await competitionsAPI<StatsRuleSet>(`/competitions/${competitionId}/stats-ruleset`);
  } catch {
    // Competição pode não ter stats configurados
    return null;
  }
}

/**
 * Busca os times e jogadores de uma competição
 */
export async function getCompetitionTeamsWithPlayers(competitionId: number): Promise<TeamWithPlayers[]> {
  return competitionsAPI<TeamWithPlayers[]>(`/competitions/${competitionId}/teams-with-players`);
}

/**
 * Registra uma pontuação/stat em uma partida
 */
export async function registerMatchScore(
  matchId: string,
  data: RegisterScoreRequest
): Promise<MatchScoreResponse> {
  return competitionsAPI<MatchScoreResponse>(`/matches/${matchId}/score`, {
    method: "POST",
    data,
    requireAuth: true,
  });
}

/**
 * Finaliza uma partida
 */
export async function finishMatch(matchId: string): Promise<MatchScoreResponse> {
  return competitionsAPI<MatchScoreResponse>(`/matches/${matchId}/finish`, {
    method: "POST",
    requireAuth: true,
  });
}

export interface MatchUpdateData {
  scheduled_datetime?: string;
  local?: string;
}

/**
 * Atualiza data e local de uma partida
 */
export async function updateMatch(
  matchId: string,
  data: MatchUpdateData
): Promise<any> {
  return competitionsAPI(`/matches/${matchId}`, {
    method: "PATCH",
    data,
    requireAuth: true,
  });
}