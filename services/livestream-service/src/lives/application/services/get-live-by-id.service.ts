import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { Live } from '../../domain/entities/live.entity.js';

@Injectable()
export class GetLiveByIdService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
  ) {}

  async execute(liveId: string): Promise<Live> {
    const live = await this.liveRepo.findById(liveId);

    if (!live) {
      throw new NotFoundException(`Live com id ${liveId} não encontrada`);
    }

    return live;
  }
}
