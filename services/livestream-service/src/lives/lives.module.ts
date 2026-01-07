import { Module } from '@nestjs/common';
import { CreateLiveService } from './application/services/create-livestream.service.js';
import { StartLiveService } from './application/services/start-live.service.js';
import { CreateLiveController } from './presentation/controllers/create-livestream.controller.js';
import { StartLiveController } from './presentation/controllers/start-live.controller.js';
import { LiveRepository } from './infrastructure/repositories/live.repository.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [CreateLiveController, StartLiveController],
  providers: [
    LiveRepository,
    {
      provide: 'ILiveRepository',
      useExisting: LiveRepository,
    },
    {
      provide: CreateLiveService,
      useClass: CreateLiveService,
    },
    {
      provide: StartLiveService,
      useClass: StartLiveService,
    },
  ],
  exports: [CreateLiveService, StartLiveService, LiveRepository],
})
export class LivesModule {}
