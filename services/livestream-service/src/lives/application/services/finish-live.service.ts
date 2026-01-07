import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { Live } from '../../domain/entities/live.entity.js';
import { LiveGateway } from '../../presentation/gateways/live.gateway.js';

@Injectable()
export class FinishLiveService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
    private liveGateway: LiveGateway,
  ) {}

  async execute(liveId: string): Promise<Live> {
    const live = await this.liveRepo.findById(liveId);

    if (!live) {
      throw new NotFoundException(`Live com id ${liveId} não encontrada`);
    }

    live.finish();

    const updatedLive = await this.liveRepo.save(live);

    this.liveGateway.emitLiveStatusChange(liveId, 'finished');

    return updatedLive;
  }
}
