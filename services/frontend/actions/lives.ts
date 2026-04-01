"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios, { AxiosError } from "axios";
import type { Live, CreateLiveDto, ListLivesParams, ChatMessage, MatchEvent, MatchEventType } from "@/types/livestream";

const API_GATEWAY_URL = process.env.API_BASE_URL || "http://localhost:8100/api";

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
      baseURL: API_GATEWAY_URL,
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
    requireAuth: true,
  });
}

export async function cancelLive(id: string): Promise<Live> {
  return livestreamAPI<Live>(`/lives/${id}/cancel`, {
    method: "PATCH",
    requireAuth: true,
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

export async function generateGoogleCalendarUrl(liveId: string, match?: Record<string, any>): Promise<string> {
  const response = await livestreamAPI<GoogleCalendarUrlResponse>('/google-calendar/generate-url', {
    method: 'POST',
    data: { liveId, match: match ? transformMatchForCalendar(match) : undefined },
    requireAuth: true,
  });
  return response.url;
}

export async function generateMultipleGoogleCalendarUrls(
  liveIds: string[],
  matchesByLiveId?: Record<string, any>,
): Promise<GoogleCalendarMultipleUrlsResponse[]> {
  const response = await livestreamAPI<GoogleCalendarMultipleUrlsResponse[]>(
    '/google-calendar/generate-multiple-urls',
    {
      method: 'POST',
  data: { liveIds, matchesByLiveId: matchesByLiveId ? mapMatchesForCalendar(matchesByLiveId) : undefined },
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

export async function createGoogleCalendarEvent(liveId: string, match?: Record<string, any>): Promise<CreateCalendarEventResponse> {
  return livestreamAPI<CreateCalendarEventResponse>('/google-calendar/create-event', {
    method: 'POST',
  data: { liveId, match: match ? transformMatchForCalendar(match) : undefined },
    requireAuth: true,
  });
}

export async function createGoogleCalendarEventWithForce(liveId: string, force: boolean, match?: Record<string, any>): Promise<CreateCalendarEventResponse> {
  return livestreamAPI<CreateCalendarEventResponse>('/google-calendar/create-event', {
    method: 'POST',
  data: { liveId, force, match: match ? transformMatchForCalendar(match) : undefined },
    requireAuth: true,
  });
}

export async function createMultipleGoogleCalendarEvents(
  liveIds: string[],
  force: boolean = false,
  matchesByLiveId?: Record<string, any>,
): Promise<CreateMultipleCalendarEventsResponse> {
  return livestreamAPI<CreateMultipleCalendarEventsResponse>(
    '/google-calendar/create-multiple-events',
    {
      method: 'POST',
      data: { liveIds, force, matchesByLiveId: matchesByLiveId ? mapMatchesForCalendar(matchesByLiveId) : undefined },
      requireAuth: true,
    }
  );
}

function transformMatchForCalendar(m: Record<string, any>) {
  if (!m) return m;

  return {
    externalMatchId: m.id ?? m.external_match_id ?? m.externalMatchId,
    competitionName: m.competition_name ?? m.competitionName ?? m.competition?.name,
    roundName: m.round_name ?? m.roundName,
    groupName: m.group_name ?? m.groupName,
    local: m.local ?? m.venue ?? m.location,
    scheduledDatetime: m.scheduled_datetime ?? m.scheduledDatetime ?? m.scheduledDatetimeUtc ?? m.scheduled_datetime_utc,
    homeTeam: m.home_team
      ? {
          id: m.home_team.id,
          name: m.home_team.name,
          logo: m.home_team.logo_url ?? m.home_team.logo,
        }
      : m.homeTeam,
    awayTeam: m.away_team
      ? {
          id: m.away_team.id,
          name: m.away_team.name,
          logo: m.away_team.logo_url ?? m.away_team.logo,
        }
      : m.awayTeam,
    homeScore: typeof m.home_score === 'number' ? m.home_score : m.homeScore,
    awayScore: typeof m.away_score === 'number' ? m.away_score : m.awayScore,
  };
}

function mapMatchesForCalendar(map: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(map)) {
    out[k] = transformMatchForCalendar(map[k]);
  }
  return out;
}

export async function checkGoogleCalendarEventsExistence(liveIds: string[]): Promise<Array<{ liveId: string; exists: boolean; eventId: string; htmlLink: string }>> {
  const params = {
    liveIds: liveIds.join(','),
  };

  return livestreamAPI<{ results: Array<{ liveId: string; exists: boolean; eventId: string; htmlLink: string }> }>(
    '/google-calendar/events',
    {
      params,
      requireAuth: true,
    }
  ).then((r) => r.results);
}

export interface GoogleCalendarOAuthUrlResponse {
  url: string;
}

export async function getGoogleCalendarOAuthUrl(redirect?: string): Promise<string> {
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

export interface PublishMatchEventDto {
  type: MatchEventType;
  payload: Record<string, unknown>;
}

export async function publishMatchEvent(
  liveId: string,
  data: PublishMatchEventDto
): Promise<MatchEvent> {
  return livestreamAPI<MatchEvent>(`/lives/${liveId}/events`, {
    method: "POST",
    data,
    requireAuth: true,
  });
}

export async function getMatchEventsHistory(
  liveId: string,
  limit: number = 50
): Promise<MatchEvent[]> {
  return livestreamAPI<MatchEvent[]>(`/lives/${liveId}/events`, {
    params: { limit },
  });
}
