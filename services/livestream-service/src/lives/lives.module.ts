import { Module } from '@nestjs/common';
import { CreateLiveService } from './application/services/create-livestream.service.js';
import { StartLiveService } from './application/services/start-live.service.js';
import { FinishLiveService } from './application/services/finish-live.service.js';
import { CancelLiveService } from './application/services/cancel-live.service.js';
import { GetLiveByIdService } from './application/services/get-live-by-id.service.js';
import { ListLivesService } from './application/services/list-lives.service.js';
import { ChatService } from './application/services/chat.service.js';
import { PublishMatchEventService } from './application/services/publish-match-event.service.js';
import { GetMatchEventsHistoryService } from './application/services/get-match-events-history.service.js';
import { CreateLiveController } from './presentation/controllers/create-livestream.controller.js';
import { StartLiveController } from './presentation/controllers/start-live.controller.js';
import { FinishLiveController } from './presentation/controllers/finish-live.controller.js';
import { CancelLiveController } from './presentation/controllers/cancel-live.controller.js';
import { GetLiveByIdController } from './presentation/controllers/get-live-by-id.controller.js';
import { ListLivesController } from './presentation/controllers/list-lives.controller.js';
import { PublishMatchEventController } from './presentation/controllers/publish-match-event.controller.js';
import { GetMatchEventsHistoryController } from './presentation/controllers/get-match-events-history.controller.js';
import { GetChatHistoryController } from './presentation/controllers/get-chat-history.controller.js';
import { LiveGateway } from './presentation/gateways/live.gateway.js';
import { LiveRepository } from './infrastructure/repositories/live.repository.js';
import { StreamKeyRepository } from './infrastructure/repositories/stream-key.repository.js';
import { ChatRepository } from './infrastructure/repositories/chat.repository.js';
import { EventRepository } from './infrastructure/repositories/event.repository.js';
import { EventPostgresRepository } from './infrastructure/repositories/event-postgres.repository.js';
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
    PublishMatchEventController,
    GetMatchEventsHistoryController,
    GetChatHistoryController,
  ],
  providers: [
    LiveRepository,
    StreamKeyRepository,
    ChatRepository,
    EventRepository,
    EventPostgresRepository,
    LiveGateway,
    {
      provide: 'ILiveRepository',
      useExisting: LiveRepository,
    },
    {
      provide: 'IStreamKeyRepository',
      useExisting: StreamKeyRepository,
    },
    {
      provide: 'IChatRepository',
      useExisting: ChatRepository,
    },
    {
      provide: 'IEventRepository',
      useExisting: EventRepository,
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
    {
      provide: ChatService,
      useClass: ChatService,
    },
    {
      provide: PublishMatchEventService,
      useClass: PublishMatchEventService,
    },
    {
      provide: GetMatchEventsHistoryService,
      useClass: GetMatchEventsHistoryService,
    },
  ],
  exports: [
    'ILiveRepository',
    'IStreamKeyRepository',
    'IChatRepository',
    'IEventRepository',
    CreateLiveService,
    StartLiveService,
    FinishLiveService,
    CancelLiveService,
    GetLiveByIdService,
    ListLivesService,
    ChatService,
    PublishMatchEventService,
    GetMatchEventsHistoryService,
    LiveRepository,
    StreamKeyRepository,
    ChatRepository,
    EventRepository,
    EventPostgresRepository,
    LiveGateway,
  ],
})
export class LivesModule {}
