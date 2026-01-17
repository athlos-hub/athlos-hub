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
    requireAuth?: boolean;
  }
): Promise<T> {
  const session = await getServerSession(authOptions);

  // Verificar se a autenticação é necessária
  const requireAuth = options?.requireAuth ?? false;
  if (requireAuth && !session?.accessToken) {
    throw new Error("Você precisa estar autenticado para realizar esta ação");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  try {
    const response = await axios<T>({
      baseURL: LIVESTREAM_API_URL,
      url: endpoint,
      method: options?.method || "GET",
      data: options?.data,
      params: options?.params,
      headers,
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; detail?: string }>;
    
    // Log para debug
    console.error('[livestreamAPI Error]', {
      endpoint,
      method: options?.method || "GET",
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      data: axiosError.response?.data,
      hasAuth: !!session?.accessToken,
    });
    
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

export interface GoogleCalendarUrlResponse {
  url: string;
}

export interface GoogleCalendarMultipleUrlsResponse {
  liveId: string;
  url: string;
}

export async function generateGoogleCalendarUrl(liveId: string): Promise<string> {
  const response = await livestreamAPI<GoogleCalendarUrlResponse>('/google-calendar/generate-url', {
    method: 'POST',
    data: { liveId },
    requireAuth: true,
  });
  return response.url;
}

export async function generateMultipleGoogleCalendarUrls(
  liveIds: string[]
): Promise<GoogleCalendarMultipleUrlsResponse[]> {
  const response = await livestreamAPI<GoogleCalendarMultipleUrlsResponse[]>(
    '/google-calendar/generate-multiple-urls',
    {
      method: 'POST',
      data: { liveIds },
      requireAuth: true,
    }
  );
  return response;
}

export interface GoogleCalendarOAuthStatus {
  authorized: boolean;
}

export interface CreateCalendarEventResponse {
  success: boolean;
  eventId: string;
  htmlLink: string;
  alreadyExists: boolean;
}

export interface CreateMultipleCalendarEventsResponse {
  success: boolean;
  results: Array<{
    liveId: string;
    eventId: string;
    htmlLink: string;
    success: boolean;
    alreadyExists: boolean;
    error?: string;
  }>;
}

export async function getGoogleCalendarOAuthStatus(): Promise<GoogleCalendarOAuthStatus> {
  return livestreamAPI<GoogleCalendarOAuthStatus>('/google-calendar/oauth/status', {
    requireAuth: true,
  });
}

export async function createGoogleCalendarEvent(liveId: string): Promise<CreateCalendarEventResponse> {
  return livestreamAPI<CreateCalendarEventResponse>('/google-calendar/create-event', {
    method: 'POST',
    data: { liveId },
    requireAuth: true,
  });
}

export async function createMultipleGoogleCalendarEvents(
  liveIds: string[]
): Promise<CreateMultipleCalendarEventsResponse> {
  return livestreamAPI<CreateMultipleCalendarEventsResponse>(
    '/google-calendar/create-multiple-events',
    {
      method: 'POST',
      data: { liveIds },
      requireAuth: true,
    }
  );
}

export interface GoogleCalendarOAuthUrlResponse {
  url: string;
}

export async function getGoogleCalendarOAuthUrl(redirect?: string): Promise<string> {
  // Chama o endpoint do backend que retorna a URL OAuth (já autenticado via server action)
  const params: Record<string, string> = {};
  if (redirect) {
    params.redirect = redirect;
  }
  
  const response = await livestreamAPI<GoogleCalendarOAuthUrlResponse>(
    '/google-calendar/oauth/authorize-url',
    {
      params,
      requireAuth: true,
    }
  );
  
  return response.url;
}
