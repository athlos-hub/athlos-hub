import { Module } from '@nestjs/common';
import { CreateLiveService } from './application/services/create-livestream.service.js';
import { StartLiveService } from './application/services/start-live.service.js';
import { FinishLiveService } from './application/services/finish-live.service.js';
import { CancelLiveService } from './application/services/cancel-live.service.js';
import { GetLiveByIdService } from './application/services/get-live-by-id.service.js';
import { ListLivesService } from './application/services/list-lives.service.js';
import { CreateLiveController } from './presentation/controllers/create-livestream.controller.js';
import { StartLiveController } from './presentation/controllers/start-live.controller.js';
import { FinishLiveController } from './presentation/controllers/finish-live.controller.js';
import { CancelLiveController } from './presentation/controllers/cancel-live.controller.js';
import { GetLiveByIdController } from './presentation/controllers/get-live-by-id.controller.js';
import { ListLivesController } from './presentation/controllers/list-lives.controller.js';
import { LiveRepository } from './infrastructure/repositories/live.repository.js';
import { StreamKeyRepository } from './infrastructure/repositories/stream-key.repository.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [
    CreateLiveController,
    StartLiveController,
    FinishLiveController,
    CancelLiveController,
    GetLiveByIdController,
    ListLivesController,
  ],
  providers: [
    LiveRepository,
    StreamKeyRepository,
    {
      provide: 'ILiveRepository',
      useExisting: LiveRepository,
    },
    {
      provide: 'IStreamKeyRepository',
      useExisting: StreamKeyRepository,
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
    {
      provide: CancelLiveService,
      useClass: CancelLiveService,
    },
    {
      provide: GetLiveByIdService,
      useClass: GetLiveByIdService,
    },
    {
      provide: ListLivesService,
      useClass: ListLivesService,
    },
  ],
  exports: [
    CreateLiveService,
    StartLiveService,
    FinishLiveService,
    CancelLiveService,
    GetLiveByIdService,
    ListLivesService,
    LiveRepository,
    StreamKeyRepository,
  ],
})
export class LivesModule {}
