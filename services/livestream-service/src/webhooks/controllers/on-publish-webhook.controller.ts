import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { OnPublishWebhookDto } from '../dto/on-publish-webhook.dto.js';
import { ValidateStreamKeyService } from '../services/validate-stream-key.service.js';

@Controller('webhooks')
export class OnPublishWebhookController {
  private readonly logger = new Logger(OnPublishWebhookController.name);

  constructor(private readonly validateStreamKeyService: ValidateStreamKeyService) {}

  @Post('on-publish')
  @HttpCode(HttpStatus.OK)
  async onPublish(@Body() dto: OnPublishWebhookDto): Promise<void> {
    try {
      const streamKey = dto.path.replace(/^\//, '');

      if (!streamKey) {
        this.logger.warn('Stream key vazia recebida');
        throw new BadRequestException('Stream key is required');
      }

      const liveId = await this.validateStreamKeyService.execute(streamKey);

      this.logger.log(`Publicação de stream aceita para live ${liveId} com key ${streamKey}`);

      return;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn(`Publicação de stream rejeitada: ${error.message}`);
        throw error;
      }

      this.logger.error('Erro ao processar webhook onPublish', error);
      throw error;
    }
  }
}
