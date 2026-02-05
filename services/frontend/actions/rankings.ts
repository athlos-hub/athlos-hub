"use server";

import { axiosAPI } from "@/lib/api/client";

export interface StandingsTeam {
  team_id: string;
  team_name: string;
  team_abbreviation: string;
  points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for?: number;
  goals_against?: number;
  goal_difference?: number;
}

export interface PlayerRanking {
  player_id: string;
  player_name: string;
  team_name: string;
  stat_value: number;
}

export async function getCompetitionStandings(
  competitionId: number,
  limit?: number
): Promise<StandingsTeam[]> {
  const queryParams: Record<string, number> = {};
  if (limit) {
    queryParams.limit = limit;
  }

  console.log(`[Rankings] Buscando standings para competição ${competitionId}`);

  const response = await axiosAPI<StandingsTeam[]>({
    endpoint: `/rankings/standings/${competitionId}`,
    method: "GET",
    queryParams,
    withAuth: false,
    service: "competitions",
  });

  console.log(`[Rankings] Standings recebidos:`, response.data);
  return response.data;
}

export async function getPlayerRankings(
  competitionId: number,
  statsMetricAbbreviation: string,
  limit?: number
): Promise<PlayerRanking[]> {
  const queryParams: Record<string, number> = {};
  if (limit) {
    queryParams.limit = limit;
  }

  console.log(`[Rankings] Buscando player rankings para competição ${competitionId}, métrica ${statsMetricAbbreviation}`);

  const response = await axiosAPI<PlayerRanking[]>({
    endpoint: `/rankings/players/${competitionId}/${statsMetricAbbreviation}`,
    method: "GET",
    queryParams,
    withAuth: false,
    service: "competitions",
  });

  console.log(`[Rankings] Player rankings recebidos:`, response.data);
  return response.data;
}

export async function getCompetitionMatches(
  competitionId: number
): Promise<any[]> {
  console.log(`[Rankings] Buscando matches para competição ${competitionId}`);

  const response = await axiosAPI<any[]>({
    endpoint: `/matches/competition/${competitionId}`,
    method: "GET",
    withAuth: false,
    service: "competitions",
  });

  console.log(`[Rankings] Matches recebidos:`, response.data);
  return response.data;
}
