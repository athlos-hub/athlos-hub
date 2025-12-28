import { Module } from '@nestjs/common';
import { CreateLiveService } from './application/services/create-livestream.service.js';
import { CreateLiveController } from './presentation/controllers/create-livestream.controller.js';
import { LiveRepository } from './infrastructure/repositories/live.repository.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [CreateLiveController],
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
  ],
  exports: [CreateLiveService, LiveRepository],
})
export class LivesModule {}
