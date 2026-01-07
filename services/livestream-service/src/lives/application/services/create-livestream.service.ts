import { Inject, Injectable } from '@nestjs/common';
import { CreateLiveDto } from '../../presentation/dto/create-livestream.dto.js';
import { randomBytes } from 'node:crypto';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import type { IStreamKeyRepository } from '../../domain/repositories/stream-key.interface.js';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';

@Injectable()
export class CreateLiveService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
    @Inject('IStreamKeyRepository')
    private streamKeyRepo: IStreamKeyRepository,
  ) {}

  async createLive(dto: CreateLiveDto) {
    const streamKey = randomBytes(24).toString('hex');

    const live = await this.liveRepo.create({
      externalMatchId: dto.externalMatchId,
      organizationId: dto.organizationId,
      streamKey,
      status: LiveStatus.SCHEDULED,
    });

    await this.streamKeyRepo.save(live.id, streamKey);

    return live;
  }
}
