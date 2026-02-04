"use server";

import { axiosAPI } from "@/lib/api/client";
import type {
  Competition,
  CompetitionCreate,
  CompetitionUpdate,
  GenerateStructureRequest,
  GenerateStructureResponse,
  CompetitionStat,
  CompetitionStatCreate,
  TeamWithPlayers,
} from "@/types/competition";

export async function listCompetitions(
  skip = 0,
  limit = 100,
  organization_slug?: string,
  status?: string
): Promise<Competition[]> {
  const queryParams: Record<string, number | string> = { skip, limit };
  if (organization_slug) {
    queryParams.organization_slug = organization_slug;
  }
  if (status) {
    queryParams.status = status;
  }
  const response = await axiosAPI<Competition[]>({
    endpoint: "/competitions/",
    method: "GET",
    queryParams,
    withAuth: false,
  });

  return response.data;
}

export async function getCompetition(id: number): Promise<Competition> {
  const response = await axiosAPI<Competition>({
    endpoint: `/competitions/${id}`,
    method: "GET",
    withAuth: true,
  });

  return response.data;
}

export async function createCompetition(
  data: CompetitionCreate
): Promise<Competition> {
  const response = await axiosAPI<Competition>({
    endpoint: "/competitions",
    method: "POST",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
  });

  return response.data;
}

export async function updateCompetition(
  id: number,
  data: CompetitionUpdate
): Promise<Competition> {
  const response = await axiosAPI<Competition>({
    endpoint: `/competitions/${id}`,
    method: "PATCH",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
  });

  return response.data;
}

export async function generateCompetitionStructure(
  competitionId: number,
  request: GenerateStructureRequest
): Promise<GenerateStructureResponse> {
  const response = await axiosAPI<GenerateStructureResponse>({
    endpoint: `/competitions/${competitionId}/generate-structure`,
    method: "POST",
    data: request as unknown as Record<string, unknown>,
    withAuth: true,
  });

  return response.data;
}

export async function getCompetitionStats(
  competitionId: number
): Promise<CompetitionStat[]> {
  const response = await axiosAPI<CompetitionStat[]>({
    endpoint: `/competitions/${competitionId}/stats`,
    method: "GET",
    withAuth: false,
  });

  return response.data;
}

export async function getCompetitionTeamsWithPlayers(
  competitionId: number
): Promise<TeamWithPlayers[]> {
  const response = await axiosAPI<TeamWithPlayers[]>({
    endpoint: `/competitions/${competitionId}/teams-with-players`,
    method: "GET",
    withAuth: false,
  });

  return response.data;
}

export async function createCompetitionStat(
  competitionId: number,
  data: CompetitionStatCreate
): Promise<CompetitionStat> {
  const response = await axiosAPI<CompetitionStat>({
    endpoint: `/competitions/${competitionId}/stats`,
    method: "POST",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
  });

  return response.data;
}
