"use server";

import { axiosAPI } from "@/lib/api/client";
import { User } from "@/types/user";
import { APIException } from "@/lib/api/errors";

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
