"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios, { AxiosError } from "axios";
import type { Live, CreateLiveDto, ListLivesParams, ChatMessage } from "@/types/livestream";

const LIVESTREAM_API_URL = process.env.LIVESTREAM_API_URL || "http://localhost:3333";

async function livestreamAPI<T>(
  endpoint: string,
  options?: {
    method?: string;
    data?: unknown;
    params?: Record<string, string | number | boolean>;
  }
): Promise<T> {
  const session = await getServerSession(authOptions);

  try {
    const response = await axios<T>({
      baseURL: LIVESTREAM_API_URL,
      url: endpoint,
      method: options?.method || "GET",
      data: options?.data,
      params: options?.params,
      headers: {
        "Content-Type": "application/json",
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; detail?: string }>;
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "Erro ao comunicar com o serviço de livestream";
    throw new Error(message);
  }
}

export async function listLives(params?: ListLivesParams): Promise<Live[]> {
  return livestreamAPI<Live[]>("/lives", {
    params: params as Record<string, string | number | boolean>,
  });
}

export async function getLiveById(id: string): Promise<Live> {
  return livestreamAPI<Live>(`/lives/${id}`);
}

export async function createLive(data: CreateLiveDto): Promise<Live> {
  return livestreamAPI<Live>("/lives", {
    method: "POST",
    data,
  });
}

export async function startLive(id: string): Promise<Live> {
  return livestreamAPI<Live>(`/lives/${id}/start`, {
    method: "PATCH",
  });
}

export async function finishLive(id: string): Promise<Live> {
  return livestreamAPI<Live>(`/lives/${id}/finish`, {
    method: "PATCH",
  });
}

export async function cancelLive(id: string): Promise<Live> {
  return livestreamAPI<Live>(`/lives/${id}/cancel`, {
    method: "PATCH",
  });
}

export async function getChatHistory(liveId: string, limit: number = 50): Promise<ChatMessage[]> {
  const response = await livestreamAPI<{ messages: ChatMessage[]; count: number }>(
    `/lives/${liveId}/chat/history`,
    {
      params: { limit },
    }
  );
  return response.messages;
}
