import { Inject, Injectable } from '@nestjs/common';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { Live } from '../../domain/entities/live.entity.js';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';

@Injectable()
export class ListLivesService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
  ) {}

  async execute(filters?: {
    status?: LiveStatus;
    organizationId?: string;
    externalMatchId?: string;
  }): Promise<Live[]> {
    return this.liveRepo.findMany(filters);
  }
}
