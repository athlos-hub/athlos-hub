import { Module } from '@nestjs/common';
import { OnPublishDoneWebhookController } from './controllers/on-publish-done-webhook.controller.js';
import { MediaMTXAuthController } from './controllers/mediamtx-auth.controller.js';
import { ValidateStreamKeyService } from './services/validate-stream-key.service.js';
import { AutoFinishLiveService } from './services/auto-finish-live.service.js';
import { CheckAbandonedLivesService } from './services/check-abandoned-lives.service.js';
import { CompetitionsClientService } from './services/competitions-client.service.js';
import { LivesModule } from '../lives/lives.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EnvModule } from '../config/env.module.js';

@Module({
  imports: [LivesModule, PrismaModule, EnvModule],
  controllers: [OnPublishDoneWebhookController, MediaMTXAuthController],
  providers: [ValidateStreamKeyService, AutoFinishLiveService, CheckAbandonedLivesService, CompetitionsClientService],
  exports: [ValidateStreamKeyService, AutoFinishLiveService],
})
export class WebhooksModule {}
