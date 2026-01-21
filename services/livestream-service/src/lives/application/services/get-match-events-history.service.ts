import { Inject, Injectable } from '@nestjs/common';
import type { IEventRepository } from '../../domain/repositories/event.interface.js';
import { MatchEvent } from '../../domain/entities/match-event.entity.js';

@Injectable()
export class GetMatchEventsHistoryService {
  constructor(
    @Inject('IEventRepository')
    private eventRepo: IEventRepository,
  ) {}

  async execute(liveId: string, limit?: number): Promise<MatchEvent[]> {
    return this.eventRepo.getRecentEvents(liveId, limit);
  }
}
