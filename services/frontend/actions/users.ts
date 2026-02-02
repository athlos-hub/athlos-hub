"use server";

import { axiosAPI } from "@/lib/api/client";
import { User } from "@/types/user";
import { APIException } from "@/lib/api/errors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getUsers(): Promise<User[]> {
  try {
    const response = await axiosAPI<User[]>({
      endpoint: "/users/",
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

export async function getUserById(userId: string): Promise<User> {
  try {
    const response = await axiosAPI<User>({
      endpoint: `/users/${userId}`,
      method: "GET",
      withAuth: true,
    });

    return response.data;
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    throw new Error("Erro ao buscar usuário");
  }
}

export async function getUserPublicInfo(keycloakId: string): Promise<User | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return null;
    }

    const response = await axiosAPI<User>({
      endpoint: `/users/keycloak/${keycloakId}`,
      method: "GET",
      withAuth: true,
      bearerToken: session.accessToken,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to fetch user public info:", error);
    return null;
  }
}

export async function getUsersPublicInfo(keycloakIds: string[]): Promise<Map<string, User>> {
  const userMap = new Map<string, User>();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return userMap;
    }

    const promises = keycloakIds.map(async (keycloakId) => {
      try {
        const user = await getUserPublicInfo(keycloakId);
        if (user) {
          userMap.set(keycloakId, user);
        }
      } catch {
      }
    });

    await Promise.all(promises);
  } catch (error) {
  }

  return userMap;
}
