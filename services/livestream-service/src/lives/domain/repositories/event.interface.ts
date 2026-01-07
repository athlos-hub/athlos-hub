import { MatchEvent } from '../entities/match-event.entity.js';

export interface IEventRepository {
  publishEvent(event: MatchEvent): Promise<void>;

  subscribe(liveId: string, callback: (event: MatchEvent) => void): Promise<void>;

  unsubscribe(liveId: string): Promise<void>;

  getRecentEvents(liveId: string, limit?: number): Promise<MatchEvent[]>;

  saveEventToHistory(event: MatchEvent): Promise<void>;
}
