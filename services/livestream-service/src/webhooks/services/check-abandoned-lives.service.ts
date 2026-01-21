import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LiveStatus } from '../../lives/domain/enums/live-status.enum.js';
import type { ILiveRepository } from '../../lives/domain/repositories/livestream.interface.js';
import type { IStreamKeyRepository } from '../../lives/domain/repositories/stream-key.interface.js';

@Injectable()
export class CheckAbandonedLivesService {
  private readonly logger = new Logger(CheckAbandonedLivesService.name);
  private readonly INACTIVE_THRESHOLD_MS = 15 * 60 * 1000;

  constructor(
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
    @Inject('IStreamKeyRepository')
    private streamKeyRepo: IStreamKeyRepository,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAbandonedLives() {
    this.logger.log('🔍 Verificando lives abandonadas...');

    try {
      const activeLives = await this.liveRepo.findMany({ status: LiveStatus.LIVE });

      if (activeLives.length === 0) {
        this.logger.debug('Nenhuma live ativa no momento');
        return;
      }

      this.logger.log(`${activeLives.length} live(s) ativa(s) encontrada(s)`);

      let finishedCount = 0;

      for (const live of activeLives) {
        const isAbandoned = await this.isLiveAbandoned(live.streamKey, live.startedAt);

        if (isAbandoned) {
          this.logger.warn(
            `⚠️ Live ${live.id} está abandonada - finalizando automaticamente`,
          );

          await this.finishLive(live);
          finishedCount++;
        }
      }

      if (finishedCount > 0) {
        this.logger.log(`✅ ${finishedCount} live(s) abandonada(s) finalizada(s) automaticamente`);
      } else {
        this.logger.debug('Todas as lives ativas estão com stream ativa');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`❌ Erro ao verificar lives abandonadas: ${message}`);
    }
  }

  private async isLiveAbandoned(streamKey: string, startedAt: Date | null): Promise<boolean> {
    if (!startedAt) {
      return false;
    }

    const isStreamActive = await this.streamKeyRepo.isActive(streamKey);

    if (isStreamActive) {
      return false;
    }

    const now = new Date();
    const timeSinceStart = now.getTime() - startedAt.getTime();

    return timeSinceStart > this.INACTIVE_THRESHOLD_MS;
  }

  private async finishLive(live: any) {
    try {
      live.finish();
      await this.liveRepo.save(live);

      await this.streamKeyRepo.markAsInactive(live.streamKey);

      this.logger.log(
        `✅ Live ${live.id} finalizada automaticamente - estava inativa há mais de 15 minutos`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`❌ Erro ao finalizar live ${live.id}: ${message}`);
    }
  }

  async checkNow() {
    this.logger.log('🔧 Verificação manual de lives abandonadas iniciada');
    await this.checkAbandonedLives();
  }
}
