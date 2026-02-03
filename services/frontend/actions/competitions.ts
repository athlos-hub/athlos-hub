"use server";

import { axiosAPI } from "@/lib/api";
import type {
  Competition,
  CompetitionCreate,
  CompetitionUpdate,
  GenerateStructureRequest,
  GenerateStructureResponse,
} from "@/types/competition";

export async function listCompetitions(
  skip = 0,
  limit = 100
): Promise<Competition[]> {
  const response = await axiosAPI<Competition[]>({
    endpoint: "/competitions",
    method: "GET",
    queryParams: { skip, limit },
    withAuth: true,
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
    data,
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
    data,
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
    data: request,
    withAuth: true,
  });

  return response.data;
}
