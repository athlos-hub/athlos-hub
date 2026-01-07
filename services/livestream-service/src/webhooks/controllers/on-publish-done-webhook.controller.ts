import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { OnPublishDoneWebhookDto } from '../dto/on-publish-done-webhook.dto.js';
import { AutoFinishLiveService } from '../services/auto-finish-live.service.js';

@Controller('webhooks')
export class OnPublishDoneWebhookController {
  private readonly logger = new Logger(OnPublishDoneWebhookController.name);

  constructor(private readonly autoFinishLiveService: AutoFinishLiveService) {}

  @Post('on-publish-done')
  @HttpCode(HttpStatus.OK)
  async onPublishDone(@Body() dto: OnPublishDoneWebhookDto): Promise<void> {
    try {
      const streamKey = dto.path.replace(/^\//, '');

      if (!streamKey) {
        this.logger.warn('Stream key vazia recebida no onPublishDone');
        return;
      }

      await this.autoFinishLiveService.execute(streamKey);

      this.logger.log(`Stream finalizada para key ${streamKey}, live finalizada automaticamente`);
    } catch (error) {
      this.logger.error('Erro ao processar webhook onPublishDone', error);
    }
  }
}
