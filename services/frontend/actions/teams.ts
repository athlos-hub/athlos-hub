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
} from "@/types/team";

interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: unknown;
}

/**
 * Busca todos os times do usuário logado
 */
export async function getMyTeams(): Promise<TeamListItem[]> {
  try {
    const response = await axiosAPI<TeamListItem[]>({
      endpoint: "/teams/me",
      method: "GET",
      withAuth: true,
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
 * Busca os detalhes de um time pelo ID
 */
export async function getTeamById(
  teamId: string,
  includeAuth: boolean = true
): Promise<TeamWithRole | TeamDetail> {
  try {
    const response = await axiosAPI<TeamWithRole | TeamDetail>({
      endpoint: `/teams/${teamId}`,
      method: "GET",
      withAuth: includeAuth,
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
 * Valida um convite (preview antes de aceitar)
 */
export async function validateTeamInvite(
  inviteToken: string
): Promise<InviteValidationResponse> {
  try {
    const response = await axiosAPI<InviteValidationResponse>({
      endpoint: `/teams/invites/${inviteToken}/validate`,
      method: "GET",
      withAuth: false,
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
 * Aceita um convite de time
 */
export async function acceptTeamInvite(
  inviteToken: string
): Promise<AcceptInviteResponse> {
  try {
    const response = await axiosAPI<AcceptInviteResponse>({
      endpoint: `/teams/invites/${inviteToken}/accept`,
      method: "POST",
      withAuth: true,
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
 * Verifica se o usuário é capitão do time
 */
export async function isCaptain(team: TeamWithRole | TeamDetail): Promise<boolean> {
  if ('role' in team) {
    return team.role === TeamRole.CAPTAIN;
  }
  return false;
}
