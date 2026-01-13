"use server";

import { axiosAPI } from "@/lib/api/client";
import { APIException } from "@/lib/api/errors";
import {
  OrganizationResponse,
  OrganizationGetPublic,
  OrganizationWithRole,
  OrganizationAdminWithRole,
  MembersListResponse,
  OrganizersListResponse,
  PendingRequestsResponse,
  TeamOverviewResponse,
  OrganizationPrivacy,
  OrganizationJoinPolicy,
  OrganizationListItem,
} from "@/types/organization";

interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

export async function createOrganization(formData: FormData): Promise<OrganizationResponse> {
  try {
    const response = await axiosAPI<OrganizationResponse>({
      endpoint: "/organizations",
      method: "POST",
      data: formData,
      withAuth: true,
      withAttachment: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao criar organização");
  }
}

export async function getOrganizations(
  privacy?: OrganizationPrivacy,
  limit: number = 50,
  offset: number = 0
): Promise<OrganizationGetPublic[]> {
  try {
    const queryParams: Record<string, string | number> = { limit, offset };
    if (privacy) {
      queryParams.privacy = privacy;
    }

    const response = await axiosAPI<OrganizationGetPublic[]>({
      endpoint: "/organizations",
      method: "GET",
      queryParams,
      withAuth: false,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar organizações");
  }
}

export async function getMyOrganizations(
  roles?: string[]
): Promise<OrganizationListItem[]> {
  try {
    const queryParams: Record<string, string> = {};
    if (roles && roles.length > 0) {
      queryParams.roles = roles.join(",");
    }

    const response = await axiosAPI<OrganizationListItem[]>({
      endpoint: "/organizations/me",
      method: "GET",
      queryParams,
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar minhas organizações");
  }
}

export async function getOrganizationBySlug(
  slug: string,
  withAuth: boolean = false
): Promise<OrganizationResponse | OrganizationGetPublic | OrganizationWithRole | OrganizationAdminWithRole> {
  try {
    const response = await axiosAPI<OrganizationResponse | OrganizationGetPublic>({
      endpoint: `/organizations/${slug}`,
      method: "GET",
      withAuth,
    });

    if (withAuth) {
      try {
        const myOrgsResponse = await axiosAPI<(OrganizationWithRole | OrganizationAdminWithRole)[]>({
          endpoint: "/organizations/me",
          method: "GET",
          withAuth: true,
        });

        const orgWithRole = myOrgsResponse.data.find(org => org.slug === slug);
        if (orgWithRole) {
          return { ...response.data, role: orgWithRole.role } as OrganizationAdminWithRole;
        }
      } catch (error) {
        console.warn("Falha ao buscar role do usuário:", error);
      }
    }

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar organização");
  }
}

export async function updateOrganization(
  slug: string,
  formData: FormData
): Promise<OrganizationResponse> {
  try {
    const response = await axiosAPI<OrganizationResponse>({
      endpoint: `/organizations/${slug}`,
      method: "PUT",
      data: formData,
      withAuth: true,
      withAttachment: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao atualizar organização");
  }
}

export async function deleteOrganization(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/organizations/${slug}`,
      method: "DELETE",
      withAuth: true,
    });

    return { success: true, message: "Organização excluída com sucesso" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao excluir organização" };
  }
}

export async function updateJoinPolicy(
  slug: string,
  joinPolicy: OrganizationJoinPolicy
): Promise<OrganizationResponse> {
  try {
    const response = await axiosAPI<OrganizationResponse>({
      endpoint: `/organizations/${slug}/settings/join-policy`,
      method: "PATCH",
      data: { join_policy: joinPolicy },
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao atualizar política de adesão");
  }
}

export async function requestToJoinOrganization(slug: string): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/organizations/${slug}/join-request`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao solicitar adesão" };
  }
}

export async function cancelJoinRequest(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/organizations/${slug}/join-request`,
      method: "DELETE",
      withAuth: true,
    });

    return { success: true, message: "Solicitação cancelada" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao cancelar solicitação" };
  }
}

export async function joinOrganizationViaLink(slug: string): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/organizations/${slug}/join-via-link`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao entrar na organização" };
  }
}

export async function approveJoinRequest(
  slug: string,
  membershipId: string
): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/organizations/${slug}/approve-request/${membershipId}`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao aprovar solicitação" };
  }
}

export async function rejectJoinRequest(
  slug: string,
  membershipId: string
): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/organizations/${slug}/reject-request/${membershipId}`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao rejeitar solicitação" };
  }
}

export async function getPendingRequests(slug: string): Promise<PendingRequestsResponse> {
  try {
    const response = await axiosAPI<PendingRequestsResponse>({
      endpoint: `/organizations/${slug}/pending-requests`,
      method: "GET",
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar solicitações pendentes");
  }
}

export async function inviteUserToOrganization(
  slug: string,
  userId: string
): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/organizations/${slug}/invite/${userId}`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao convidar usuário" };
  }
}

export async function cancelInvite(slug: string, userId: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/organizations/${slug}/invite/${userId}`,
      method: "DELETE",
      withAuth: true,
    });

    return { success: true, message: "Convite cancelado" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao cancelar convite" };
  }
}

export async function getSentInvites(slug: string): Promise<PendingRequestsResponse> {
  try {
    const response = await axiosAPI<PendingRequestsResponse>({
      endpoint: `/organizations/${slug}/sent-invites`,
      method: "GET",
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar convites enviados");
  }
}

export async function acceptOrganizationInvite(slug: string): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/users/organizations/${slug}/accept-invite`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao aceitar convite" };
  }
}

export async function declineOrganizationInvite(slug: string): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/users/organizations/${slug}/decline-invite`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao recusar convite" };
  }
}

export async function getOrganizationMembers(slug: string): Promise<MembersListResponse> {
  try {
    const response = await axiosAPI<MembersListResponse>({
      endpoint: `/organizations/${slug}/members`,
      method: "GET",
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar membros");
  }
}

export async function removeMember(slug: string, userId: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/organizations/${slug}/members/${userId}`,
      method: "DELETE",
      withAuth: true,
    });

    return { success: true, message: "Membro removido com sucesso" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao remover membro" };
  }
}

export async function leaveOrganization(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/users/organizations/${slug}/leave`,
      method: "DELETE",
      withAuth: true,
    });

    return { success: true, message: "Você saiu da organização" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao sair da organização" };
  }
}

export async function getOrganizationOrganizers(slug: string): Promise<OrganizersListResponse> {
  try {
    const response = await axiosAPI<OrganizersListResponse>({
      endpoint: `/organizations/${slug}/organizers`,
      method: "GET",
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar organizadores");
  }
}

export async function addOrganizer(slug: string, userId: string): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string }>({
      endpoint: `/organizations/${slug}/organizers/${userId}`,
      method: "POST",
      data: {},
      withAuth: true,
    });

    return { success: true, message: response.data.message };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao adicionar organizador" };
  }
}

export async function removeOrganizer(slug: string, userId: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/organizations/${slug}/organizers/${userId}`,
      method: "DELETE",
      withAuth: true,
    });

    return { success: true, message: "Organizador removido com sucesso" };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao remover organizador" };
  }
}

export async function getTeamOverview(slug: string): Promise<TeamOverviewResponse> {
  try {
    const response = await axiosAPI<TeamOverviewResponse>({
      endpoint: `/organizations/${slug}/team`,
      method: "GET",
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar visão geral da equipe");
  }
}

export async function transferOwnership(
  slug: string,
  newOwnerId: string
): Promise<ActionResponse> {
  try {
    const response = await axiosAPI<{ message: string; new_owner_id: string }>({
      endpoint: `/organizations/${slug}/transfer-ownership`,
      method: "POST",
      data: { new_owner_id: newOwnerId },
      withAuth: true,
    });

    return { success: true, message: response.data.message, data: response.data };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao transferir propriedade" };
  }
}
