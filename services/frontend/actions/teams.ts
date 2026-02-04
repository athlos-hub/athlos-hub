"use server";

import { axiosAPI } from "@/lib/api/client";
import { APIException } from "@/lib/api/errors";
import {
  TeamListItem,
  TeamDetail,
  TeamWithRole,
  TeamInvite,
  CreateInviteRequest,
  InviteValidationResponse,
  AcceptInviteResponse,
  TeamRole,
  TeamCreateRequest,
  TeamCreateResponse,
  TeamApprovalResponse,
} from "@/types/team";

interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: unknown;
}

/**
 * Cria um novo time (no auth-service)
 */
export async function createTeam(data: TeamCreateRequest): Promise<TeamCreateResponse> {
  try {
    const response = await axiosAPI<TeamCreateResponse>({
      endpoint: "/teams/",
      method: "POST",
      data: data as unknown as Record<string, unknown>,
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao criar time");
  }
}

/**
 * Busca todos os times do usuário logado (do auth-service)
 */
export async function getMyTeams(): Promise<TeamListItem[]> {
  try {
    const response = await axiosAPI<TeamListItem[]>({
      endpoint: "/teams/me",
      method: "GET",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar seus times");
  }
}

/**
 * Busca os detalhes de um time pelo ID (do auth-service)
 */
export async function getTeamById(teamId: string): Promise<TeamDetail> {
  try {
    const response = await axiosAPI<TeamDetail>({
      endpoint: `/teams/${teamId}`,
      method: "GET",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar time");
  }
}

/**
 * Busca times de uma organização (do auth-service)
 */
export async function getOrganizationTeams(
  organizationSlug: string,
  status?: string
): Promise<TeamListItem[]> {
  try {
    const queryParams: Record<string, string> = {};
    if (status) {
      queryParams.status = status;
    }

    const response = await axiosAPI<TeamListItem[]>({
      endpoint: `/teams/organization/${organizationSlug}`,
      method: "GET",
      queryParams,
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar times da organização");
  }
}

/**
 * Gera um link de convite para o time (apenas capitão)
 */
export async function createTeamInvite(
  teamId: string,
  data?: CreateInviteRequest
): Promise<TeamInvite> {
  try {
    const requestData: Record<string, unknown> = data ? { ...data } : {};
    const response = await axiosAPI<TeamInvite>({
      endpoint: `/teams/${teamId}/invites`,
      method: "POST",
      data: requestData,
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao gerar convite");
  }
}

/**
 * Lista convites do time (apenas capitão)
 */
export async function listTeamInvites(teamId: string): Promise<TeamInvite[]> {
  try {
    const response = await axiosAPI<TeamInvite[]>({
      endpoint: `/teams/${teamId}/invites`,
      method: "GET",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao listar convites");
  }
}

/**
 * Revoga um convite (apenas capitão)
 */
export async function revokeTeamInvite(
  teamId: string,
  inviteToken: string
): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/teams/${teamId}/invites/${inviteToken}`,
      method: "DELETE",
      withAuth: true,
      service: "auth",
    });

    return { success: true, message: "Convite revogado com sucesso" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao revogar convite" };
  }
}

/**
 * Valida um convite (preview antes de aceitar) - Público
 */
export async function validateTeamInvite(
  inviteToken: string
): Promise<InviteValidationResponse> {
  try {
    const response = await axiosAPI<InviteValidationResponse>({
      endpoint: `/teams/invites/${inviteToken}/validate`,
      method: "GET",
      withAuth: false,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: "Erro ao validar convite" };
  }
}

/**
 * Aceita um convite de time (também adiciona usuário à organização)
 */
export async function acceptTeamInvite(
  inviteToken: string
): Promise<AcceptInviteResponse> {
  try {
    const response = await axiosAPI<AcceptInviteResponse>({
      endpoint: `/teams/invites/${inviteToken}/accept`,
      method: "POST",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao aceitar convite");
  }
}

/**
 * Solicita aprovação do time (apenas capitão, requer min_members)
 */
export async function requestTeamApproval(teamId: string): Promise<TeamDetail> {
  try {
    const response = await axiosAPI<TeamDetail>({
      endpoint: `/teams/${teamId}/request-approval`,
      method: "POST",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao solicitar aprovação do time");
  }
}

/**
 * Aprova o time (apenas organizador/owner)
 */
export async function approveTeam(teamId: string): Promise<TeamApprovalResponse> {
  try {
    const response = await axiosAPI<TeamApprovalResponse>({
      endpoint: `/teams/${teamId}/approve`,
      method: "POST",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao aprovar time");
  }
}

/**
 * Rejeita um time (apenas organizador/owner)
 */
export async function rejectTeam(
  teamId: string,
  reason?: string
): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/teams/${teamId}/reject`,
      method: "POST",
      data: { reason } as unknown as Record<string, unknown>,
      withAuth: true,
      service: "auth",
    });

    return { success: true, message: "Time rejeitado" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao rejeitar time" };
  }
}

/**
 * Busca times pendentes de aprovação de uma organização (apenas organizador/owner)
 */
export async function getPendingTeams(
  organizationSlug: string
): Promise<TeamDetail[]> {
  try {
    const response = await axiosAPI<TeamDetail[]>({
      endpoint: `/teams/organization/${organizationSlug}/pending`,
      method: "GET",
      withAuth: true,
      service: "auth",
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar times pendentes");
  }
}


export async function canPostAsTeam(teamId: string): Promise<boolean> {
  try {
    const teams = await getMyTeams();
    return teams.some(team => team.id === teamId);
  } catch {
    return false;
  }
}
