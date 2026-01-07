import { Module } from '@nestjs/common';
import { OnPublishWebhookController } from './controllers/on-publish-webhook.controller.js';
import { ValidateStreamKeyService } from './services/validate-stream-key.service.js';
import { LivesModule } from '../lives/lives.module.js';

@Module({
  imports: [LivesModule],
  controllers: [OnPublishWebhookController],
  providers: [ValidateStreamKeyService],
  exports: [ValidateStreamKeyService],
})
export class WebhooksModule {}
