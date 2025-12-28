import { Inject, Injectable } from '@nestjs/common';
import { CreateLiveDto } from '../../presentation/dto/create-livestream.dto.js';
import { randomBytes } from 'node:crypto';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';

@Injectable()
export class CreateLiveService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
  ) {}

  async createLive(dto: CreateLiveDto) {
    const streamKey = randomBytes(24).toString('hex');

    return this.liveRepo.create({
      externalMatchId: dto.externalMatchId,
      organizationId: dto.organizationId,
      streamKey,
      status: LiveStatus.SCHEDULED,
    });
  }
}
