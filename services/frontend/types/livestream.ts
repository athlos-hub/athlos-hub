export enum LiveStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum MatchEventType {
  GOAL = 'GOAL',
  FOUL = 'FOUL',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
  PERIOD_START = 'PERIOD_START',
  PERIOD_END = 'PERIOD_END',
  PENALTY = 'PENALTY',
  OWN_GOAL = 'OWN_GOAL',
  VAR_REVIEW = 'VAR_REVIEW',
}

export interface Live {
  id: string;
  externalMatchId: string;
  organizationId: string;
  streamKey: string;
  status: LiveStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface CreateLiveDto {
  externalMatchId: string;
  organizationId: string;
}

export interface ListLivesParams {
  status?: LiveStatus;
  organizationId?: string;
  externalMatchId?: string;
}

export interface MatchEvent {
  id: string;
  liveId: string;
  type: MatchEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: Date | string;
}

export interface JoinLivePayload {
  liveId: string;
}

export interface ChatMessagePayload {
  liveId: string;
  userId: string;
  userName: string;
  message: string;
}
