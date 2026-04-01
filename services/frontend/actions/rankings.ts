"use server";

import { axiosAPI } from "@/lib/api/client";

export interface StandingsTeam {
  team_id: string;
  team_name: string;
  team_abbreviation: string;
  team_logo_url?: string | null;
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
  competitionId: string,
  limit?: number
): Promise<StandingsTeam[]> {
  const queryParams: Record<string, number> = {};
  if (limit) {
    queryParams.limit = limit;
  }
  const response = await axiosAPI<StandingsTeam[]>({
    endpoint: `/rankings/standings/${competitionId}`,
    method: "GET",
    queryParams,
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function getPlayerRankings(
  competitionId: string,
  statsMetricAbbreviation: string,
  limit?: number
): Promise<PlayerRanking[]> {
  const queryParams: Record<string, number> = {};
  if (limit) {
    queryParams.limit = limit;
  }
  const response = await axiosAPI<PlayerRanking[]>({
    endpoint: `/rankings/players/${competitionId}/${statsMetricAbbreviation}`,
    method: "GET",
    queryParams,
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function getCompetitionMatches(
  competitionId: string
): Promise<any[]> {
  const response = await axiosAPI<any[]>({
    endpoint: `/matches/competition/${competitionId}`,
    method: "GET",
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}
