import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MediaMTXAuthDto } from '../dto/mediamtx-auth.dto.js';
import { ValidateStreamKeyService } from '../services/validate-stream-key.service.js';

@Controller('webhooks')
export class MediaMTXAuthController {
  private readonly logger = new Logger(MediaMTXAuthController.name);

  constructor(private readonly validateStreamKeyService: ValidateStreamKeyService) {}

  @Post('mediamtx-auth')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async authenticate(@Body() dto: MediaMTXAuthDto): Promise<void> {
    this.logger.log(
      `MediaMTX auth request: action=${dto.action}, path=${dto.path}, ip=${dto.ip}, protocol=${dto.protocol}`,
    );

    try {
      if (dto.action === 'publish') {
        await this.handlePublishAuth(dto);
      } else if (dto.action === 'read') {
        this.logger.log(`Leitura permitida para path: ${dto.path}`);
        return;
      } else {
        this.logger.warn(`Ação desconhecida: ${dto.action}`);
        return;
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn(`Autenticação negada: ${error.message}`);
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erro na autenticação: ${errorMessage}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private async handlePublishAuth(dto: MediaMTXAuthDto): Promise<void> {
    const streamKey = this.extractStreamKey(dto.path);

    if (!streamKey) {
      this.logger.warn(`Stream key vazia no path: ${dto.path}`);
      throw new UnauthorizedException('Invalid stream key');
    }

    this.logger.log(`Validando stream key: ${streamKey}`);

    const liveId = await this.validateStreamKeyService.execute(streamKey);

    this.logger.log(
      `Stream key ${streamKey} válida! Live ${liveId} iniciada. Publicação aceita de IP ${dto.ip}`,
    );
  }

  private extractStreamKey(path: string): string {
    const cleanPath = path.replace(/^\//, '');

    if (cleanPath === 'live') {
      return '';
    }

    if (cleanPath.startsWith('live/')) {
      let streamKey = cleanPath.replace('live/', '');
      const queryIndex = streamKey.indexOf('?');
      if (queryIndex !== -1) {
        streamKey = streamKey.substring(0, queryIndex);
      }
      return streamKey;
    }

    const queryIndex = cleanPath.indexOf('?');
    if (queryIndex !== -1) {
      return cleanPath.substring(0, queryIndex);
    }

    return cleanPath;
  }
}
