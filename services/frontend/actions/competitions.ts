"use server";

import { axiosAPI } from "@/lib/api/client";
import type {
  Competition,
  CompetitionCreate,
  CompetitionHighlights,
  CompetitionUpdate,
  GenerateStructureRequest,
  GenerateStructureResponse,
  CompetitionStat,
  CompetitionStatCreate,
  TeamWithPlayers,
  CompetitionAchievementDefinition,
  CompetitionAchievementAward,
  CompetitionFinalize,
} from "@/types/competition";
import type { StatsRuleSet } from "@/types/stats";

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
    service: "competitions",
  });

  return response.data;
}

export async function getCompetition(id: string): Promise<Competition> {
  const response = await axiosAPI<Competition>({
    endpoint: `/competitions/${id}`,
    method: "GET",
    withAuth: false,
    service: "competitions",
  });

  return response.data;
}

export async function getCompetitionHighlights(
  id: string
): Promise<CompetitionHighlights> {
  const response = await axiosAPI<CompetitionHighlights>({
    endpoint: `/competitions/${id}/highlights`,
    method: "GET",
    withAuth: false,
    service: "competitions",
  });
  return response.data;
}

export async function createCompetition(
  data: CompetitionCreate
): Promise<Competition> {
  try {
    const response = await axiosAPI<Competition>({
      endpoint: "/competitions/",
      method: "POST",
      data: data as unknown as Record<string, unknown>,
      withAuth: true,
      service: "competitions",
    });
    
    return response.data;
  } catch (error) {
    console.error("[ACTION createCompetition] Erro:", error);
    throw error;
  }
}

export async function updateCompetition(
  id: string,
  data: CompetitionUpdate
): Promise<Competition> {
  const response = await axiosAPI<Competition>({
    endpoint: `/competitions/${id}`,
    method: "PUT",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function deleteCompetition(id: string): Promise<void> {
  await axiosAPI<void>({
    endpoint: `/competitions/${id}`,
    method: "DELETE",
    withAuth: true,
    service: "competitions",
  });
}

export async function generateCompetitionStructure(
  competitionId: string,
  request: GenerateStructureRequest
): Promise<GenerateStructureResponse> {
  const response = await axiosAPI<GenerateStructureResponse>({
    endpoint: `/competitions/${competitionId}/generate-structure`,
    method: "POST",
    data: request as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function finalizeCompetition(
  competitionId: string
): Promise<CompetitionFinalize> {
  const response = await axiosAPI<CompetitionFinalize>({
    endpoint: `/competitions/${competitionId}/finalize`,
    method: "POST",
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function getCompetitionStats(
  competitionId: string
): Promise<CompetitionStat[]> {
  const response = await axiosAPI<CompetitionStat[]>({
    endpoint: `/competitions/${competitionId}/stats`,
    method: "GET",
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function getCompetitionAchievementDefinitions(
  competitionId: string
): Promise<CompetitionAchievementDefinition[]> {
  const response = await axiosAPI<CompetitionAchievementDefinition[]>({
    endpoint: `/competitions/${competitionId}/achievement-definitions`,
    method: "GET",
    withAuth: false,
    service: "competitions",
  });
  return response.data;
}

export async function getCompetitionAchievementAwards(
  competitionId: string
): Promise<CompetitionAchievementAward[]> {
  const response = await axiosAPI<CompetitionAchievementAward[]>({
    endpoint: `/competitions/${competitionId}/achievement-awards`,
    method: "GET",
    withAuth: false,
    service: "competitions",
  });
  return response.data;
}

export async function updateCompetitionAchievementDefinition(
  competitionId: string,
  definitionId: string,
  data:
    | { title: string }
    | { reset_auto_title: true }
    | { target_type: "PLAYER" | "TEAM" }
    | { title: string; target_type: "PLAYER" | "TEAM" }
): Promise<CompetitionAchievementDefinition> {
  const response = await axiosAPI<CompetitionAchievementDefinition>({
    endpoint: `/competitions/${competitionId}/achievement-definitions/${definitionId}`,
    method: "PATCH",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

function pickTeamLogoUrl(
  row: TeamWithPlayers & { logoUrl?: string | null }
): string | null {
  const a = row.logo_url?.trim();
  const b = typeof row.logoUrl === "string" ? row.logoUrl.trim() : "";
  return a || b || null;
}

function pickAuthTeamId(
  row: TeamWithPlayers & { authTeamId?: string | null }
): string | null {
  const a = row.auth_team_id?.trim();
  const b = typeof row.authTeamId === "string" ? row.authTeamId.trim() : "";
  return a || b || null;
}

/**
 * Times da competição com jogadores; completa `logo_url` pelo auth quando o
 * competitions ainda não tiver (ex.: times antigos ou sync pendente).
 */
export async function getCompetitionTeamsWithPlayers(
  competitionId: string
): Promise<TeamWithPlayers[]> {
  const response = await axiosAPI<TeamWithPlayers[]>({
    endpoint: `/competitions/${competitionId}/teams-with-players`,
    method: "GET",
    withAuth: false,
    service: "competitions",
  });

  const raw = response.data;
  if (!Array.isArray(raw)) return [];

  return Promise.all(
    raw.map(async (item) => {
      const row = item as TeamWithPlayers & {
        logoUrl?: string | null;
        authTeamId?: string | null;
      };
      let logo_url = pickTeamLogoUrl(row);
      const authId = pickAuthTeamId(row);
      if (!logo_url && authId) {
        try {
          const authRes = await axiosAPI<{ logo_url?: string | null }>({
            endpoint: `/teams/${authId}`,
            method: "GET",
            withAuth: true,
            service: "auth",
          });
          logo_url = authRes.data?.logo_url?.trim() || null;
        } catch {
          /* ignora: auth indisponível */
        }
      }
      if (!logo_url && item.id) {
        try {
          const authRes = await axiosAPI<{ logo_url?: string | null }>({
            endpoint: `/teams/${item.id}`,
            method: "GET",
            withAuth: true,
            service: "auth",
          });
          logo_url = authRes.data?.logo_url?.trim() || null;
        } catch {
          /* time não encontrado no auth ou sem sessão */
        }
      }
      return { ...item, logo_url: logo_url ?? null };
    })
  );
}
export async function listSportRulesets(
  skip = 0,
  limit = 100,
  organization_slug?: string
): Promise<any[]> {
  const queryParams: Record<string, number | string> = { skip, limit };
  if (organization_slug) {
    queryParams.organization_slug = organization_slug;
  }
  const response = await axiosAPI<any[]>({
    endpoint: "/sport-rulesets/",
    method: "GET",
    queryParams,
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

export async function listStatsRulesets(
  skip = 0,
  limit = 100
): Promise<any[]> {
  const response = await axiosAPI<any[]>({
    endpoint: "/stats-rulesets/",
    method: "GET",
    queryParams: { skip, limit },
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

export async function getCompetitionStatsRuleset(
  competitionId: string
): Promise<StatsRuleSet | null> {
  try {
    const response = await axiosAPI<StatsRuleSet>({
      endpoint: `/competitions/${competitionId}/stats-ruleset`,
      method: "GET",
      withAuth: false,
      service: "competitions",
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function createStatsRulesetForCompetition(
  competitionId: string,
  data: {
    name: string;
    description?: string;
    stats_types?: CompetitionStatCreate[];
  }
): Promise<StatsRuleSet> {
  const response = await axiosAPI<StatsRuleSet>({
    endpoint: `/stats-rulesets/competition/${competitionId}`,
    method: "POST",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

export async function addStatTypeToRuleset(
  rulesetId: string,
  data: CompetitionStatCreate
): Promise<CompetitionStat> {
  const response = await axiosAPI<CompetitionStat>({
    endpoint: `/stats-rulesets/${rulesetId}/stats`,
    method: "POST",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}

export async function updateStatTypeInRuleset(
  rulesetId: string,
  statTypeId: string,
  data: Partial<CompetitionStatCreate>
): Promise<CompetitionStat> {
  const response = await axiosAPI<CompetitionStat>({
    endpoint: `/stats-rulesets/${rulesetId}/stats/${statTypeId}`,
    method: "PATCH",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });
  return response.data;
}

export async function deleteStatTypeFromRuleset(
  rulesetId: string,
  statTypeId: string
): Promise<void> {
  await axiosAPI<void>({
    endpoint: `/stats-rulesets/${rulesetId}/stats/${statTypeId}`,
    method: "DELETE",
    withAuth: true,
    service: "competitions",
  });
}

export interface AdvanceGroupPhaseResponse {
  message: string;
  qualified_teams: number;
  matches_updated: number;
  round_name: string;
}

export async function advanceGroupPhase(
  competitionId: string
): Promise<AdvanceGroupPhaseResponse> {
  try {
    const response = await axiosAPI<AdvanceGroupPhaseResponse>({
      endpoint: `/competitions/${competitionId}/advance-group-phase`,
      method: "POST",
      withAuth: true,
      service: "competitions",
    });

    return response.data;
  } catch (error) {
    console.error("[ACTION advanceGroupPhase] Erro:", error);
    throw error;
  }
}
