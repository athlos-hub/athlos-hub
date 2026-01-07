import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import type { IEventRepository } from '../../domain/repositories/event.interface.js';
import { MatchEvent } from '../../domain/entities/match-event.entity.js';
import { MatchEventType } from '../../domain/enums/match-event-type.enum.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PublishMatchEventService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
    @Inject('IEventRepository')
    private eventRepo: IEventRepository,
  ) {}

  async execute(
    liveId: string,
    eventType: MatchEventType,
    payload: Record<string, unknown>,
  ): Promise<MatchEvent> {
    const live = await this.liveRepo.findById(liveId);

    if (!live) {
      throw new NotFoundException(`Live com id ${liveId} não encontrada`);
    }

    if (!live.isLive()) {
      throw new BadRequestException(
        `Não é possível publicar eventos para live ${liveId} - status atual: ${live.status}`,
      );
    }

    const event = MatchEvent.create(randomUUID(), liveId, eventType, payload);

    await this.eventRepo.publishEvent(event);

    return event;
  }
}
