export enum LiveStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum MatchEventType {
  SCORE = 'SCORE',
  PERIOD_START = 'PERIOD_START',
  PERIOD_END = 'PERIOD_END',
  TIMEOUT = 'TIMEOUT',
  SUBSTITUTION = 'SUBSTITUTION',
  FOUL = 'FOUL',
  WARNING = 'WARNING',
  EJECTION = 'EJECTION',
  REVIEW = 'REVIEW',
  INJURY = 'INJURY',
  CUSTOM = 'CUSTOM',
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
