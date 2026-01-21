import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IStreamKeyRepository } from '../../lives/domain/repositories/stream-key.interface.js';
import type { ILiveRepository } from '../../lives/domain/repositories/livestream.interface.js';

@Injectable()
export class AutoFinishLiveService {
  private readonly logger = new Logger(AutoFinishLiveService.name);

  constructor(
    @Inject('IStreamKeyRepository')
    private streamKeyRepo: IStreamKeyRepository,
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
  ) {}

  async execute(streamKey: string): Promise<void> {
    const liveId = await this.streamKeyRepo.findLiveIdByStreamKey(streamKey);

    if (!liveId) {
      this.logger.warn(`Stream key ${streamKey} não encontrada no Redis`);
      return;
    }

    await this.streamKeyRepo.markAsInactive(streamKey);

    const live = await this.liveRepo.findById(liveId);

    if (!live) {
      this.logger.warn(`Live ${liveId} não encontrada no banco de dados`);
      return;
    }

    if (!live.isLive()) {
      this.logger.log(`Live ${liveId} não está ativa, pulando finalização automática`);
      return;
    }

    try {
      live.finish();
      await this.liveRepo.save(live);
      this.logger.log(`Live ${liveId} finalizada automaticamente após término da stream`);
    } catch (error) {
      this.logger.error(`Falha ao finalizar live ${liveId}`, error);
      throw error;
    }
  }
}
