import { Module } from '@nestjs/common';
import { CreateLiveService } from './application/services/create-livestream.service.js';
import { StartLiveService } from './application/services/start-live.service.js';
import { FinishLiveService } from './application/services/finish-live.service.js';
import { CreateLiveController } from './presentation/controllers/create-livestream.controller.js';
import { StartLiveController } from './presentation/controllers/start-live.controller.js';
import { FinishLiveController } from './presentation/controllers/finish-live.controller.js';
import { LiveRepository } from './infrastructure/repositories/live.repository.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [CreateLiveController, StartLiveController, FinishLiveController],
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
    {
      provide: FinishLiveService,
      useClass: FinishLiveService,
    },
  ],
  exports: [CreateLiveService, StartLiveService, FinishLiveService, LiveRepository],
})
export class LivesModule {}
