import { Module } from '@nestjs/common';
import { OnPublishWebhookController } from './controllers/on-publish-webhook.controller.js';
import { OnPublishDoneWebhookController } from './controllers/on-publish-done-webhook.controller.js';
import { ValidateStreamKeyService } from './services/validate-stream-key.service.js';
import { AutoFinishLiveService } from './services/auto-finish-live.service.js';
import { LivesModule } from '../lives/lives.module.js';

@Module({
  imports: [LivesModule],
  controllers: [OnPublishWebhookController, OnPublishDoneWebhookController],
  providers: [ValidateStreamKeyService, AutoFinishLiveService],
  exports: [ValidateStreamKeyService, AutoFinishLiveService],
})
export class WebhooksModule {}
