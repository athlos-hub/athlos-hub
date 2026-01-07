import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IStreamKeyRepository } from '../../lives/domain/repositories/stream-key.interface.js';
import type { ILiveRepository } from '../../lives/domain/repositories/livestream.interface.js';

@Injectable()
export class ValidateStreamKeyService {
  constructor(
    @Inject('IStreamKeyRepository')
    private streamKeyRepo: IStreamKeyRepository,
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
  ) {}

  async execute(streamKey: string): Promise<string> {
    const liveId = await this.streamKeyRepo.findLiveIdByStreamKey(streamKey);

    if (!liveId) {
      throw new UnauthorizedException('Invalid stream key');
    }

    const live = await this.liveRepo.findById(liveId);

    if (!live) {
      throw new UnauthorizedException('Live not found');
    }

    if (!live.isScheduled() && !live.isLive()) {
      throw new UnauthorizedException('Live is not in a valid state to accept streams');
    }

    await this.streamKeyRepo.markAsActive(streamKey);

    if (live.isScheduled()) {
      live.start();
      await this.liveRepo.save(live);
    }

    return liveId;
  }
}
