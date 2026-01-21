"use server";

import { axiosAPI } from "@/lib/api/client";
import { APIException } from "@/lib/api/errors";
import { OrganizationResponse } from "@/types/organization";
import { OrganizationStatus } from "@/types/organization";
import { UserAdmin } from "@/types/user";

interface ActionResponse {
  success: boolean;
  error?: string;
}

export async function getAllUsers(): Promise<UserAdmin[]> {
  try {
    const response = await axiosAPI<UserAdmin[]>({
      endpoint: "/admin/users",
      method: "GET",
      withAuth: true,
    });
    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar usuários");
  }
}

export async function suspendUser(userId: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/admin/users/${userId}`,
      method: "DELETE",
      withAuth: true,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message || "Erro ao suspender usuário" };
    }
    return { success: false, error: "Erro ao suspender usuário" };
  }
}

export async function getAllOrganizations(
  statusFilter?: OrganizationStatus
): Promise<OrganizationResponse[]> {
  try {
    const queryParams: Record<string, string> = {};
    if (statusFilter) {
      queryParams.status = statusFilter;
    }
    
    const response = await axiosAPI<OrganizationResponse[]>({
      endpoint: "/admin/organizations",
      method: "GET",
      withAuth: true,
      queryParams,
    });
    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar organizações");
  }
}

export async function acceptOrganization(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/admin/organizations/accept/${slug}`,
      method: "PATCH",
      withAuth: true,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message || "Erro ao aceitar organização" };
    }
    return { success: false, error: "Erro ao aceitar organização" };
  }
}

export async function rejectOrganization(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/admin/organizations/delete/${slug}`,
      method: "DELETE",
      withAuth: true,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message || "Erro ao rejeitar organização" };
    }
    return { success: false, error: "Erro ao rejeitar organização" };
  }
}

export async function suspendOrganization(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/admin/organizations/suspend/${slug}`,
      method: "DELETE",
      withAuth: true,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message || "Erro ao suspender organização" };
    }
    return { success: false, error: "Erro ao suspender organização" };
  }
}

export async function unsuspendUser(userId: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/admin/users/${userId}/unsuspend`,
      method: "PATCH",
      withAuth: true,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message || "Erro ao reativar usuário" };
    }
    return { success: false, error: "Erro ao reativar usuário" };
  }
}

export async function unsuspendOrganization(slug: string): Promise<ActionResponse> {
  try {
    await axiosAPI({
      endpoint: `/admin/organizations/unsuspend/${slug}`,
      method: "PATCH",
      withAuth: true,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIException) {
      return { success: false, error: error.message || "Erro ao reativar organização" };
    }
    return { success: false, error: "Erro ao reativar organização" };
  }
}
