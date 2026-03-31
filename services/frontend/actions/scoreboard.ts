"use server";

import { axiosAPI } from "@/lib/api/client";

interface UpdateScoreRequest {
  segment_number: number;
  home_score: number;
  away_score: number;
  finished: boolean;
}

export async function initializeMatchSegments(
  matchId: string,
  numSegments: number = 2
) {
  const response = await axiosAPI({
    endpoint: `/scoreboard/${matchId}/initialize?num_segments=${numSegments}`,
    method: "POST",
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

export async function updateSegmentScore(
  matchId: string,
  data: UpdateScoreRequest
) {
  const response = await axiosAPI({
    endpoint: `/scoreboard/${matchId}/update`,
    method: "POST",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

export async function getScoreboard(matchId: string) {
  const response = await axiosAPI({
    endpoint: `/scoreboard/${matchId}`,
    method: "GET",
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}