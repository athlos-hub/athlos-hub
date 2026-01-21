import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { IStreamKeyRepository } from '../../lives/domain/repositories/stream-key.interface.js';
import type { ILiveRepository } from '../../lives/domain/repositories/livestream.interface.js';

@Injectable()
export class ValidateStreamKeyService {
  private readonly logger = new Logger(ValidateStreamKeyService.name);

  constructor(
    @Inject('IStreamKeyRepository')
    private streamKeyRepo: IStreamKeyRepository,
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
  ) {}

  async execute(streamKey: string): Promise<string> {
    const metadata = await this.streamKeyRepo.getMetadata(streamKey);

    if (!metadata) {
      this.logger.warn(`Chave de transmissão inválida: ${streamKey}`);
      throw new UnauthorizedException('Chave de transmissão inválida');
    }

    const live = await this.liveRepo.findById(metadata.liveId);

    if (!live) {
      this.logger.warn(`Live não encontrada para stream key: ${streamKey}`);
      throw new UnauthorizedException('Live não encontrada');
    }

    if (!live.isScheduled() && !live.isLive()) {
      this.logger.warn(`Live ${live.id} não está em estado válido: ${live.status}`);
      throw new ConflictException('Live não está em um estado válido para aceitar transmissões');
    }

    this.logger.log(`Transmissão autorizada: liveId=${live.id}`);

    await this.streamKeyRepo.markAsActive(streamKey);

    if (live.isScheduled()) {
      live.start();
      await this.liveRepo.save(live);
      this.logger.log(`Live ${live.id} iniciada automaticamente`);
    }

    return live.id;
  }
}
