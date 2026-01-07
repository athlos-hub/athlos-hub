import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { LiveGateway } from '../../presentation/gateways/live.gateway.js';

@Injectable()
export class PublishMatchEventService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
    private liveGateway: LiveGateway,
  ) {}

  async execute(
    liveId: string,
    eventType: string,
    eventData: Record<string, unknown>,
  ): Promise<void> {
    const live = await this.liveRepo.findById(liveId);

    if (!live) {
      throw new NotFoundException(`Live com id ${liveId} não encontrada`);
    }

    if (!live.isLive()) {
      throw new NotFoundException(`Live ${liveId} não está ativa no momento`);
    }

    this.liveGateway.emitMatchEvent(liveId, {
      eventType,
      ...eventData,
      timestamp: new Date(),
    });
  }
}
