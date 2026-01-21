import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleCalendarController } from './presentation/controllers/google-calendar.controller.js';
import { GoogleOAuthController } from './presentation/controllers/google-oauth.controller.js';
import { GoogleCalendarService } from './application/services/google-calendar.service.js';
import { GoogleOAuthService } from './application/services/google-oauth.service.js';
import { GoogleCalendarApiService } from './application/services/google-calendar-api.service.js';
import { GoogleCalendarTokenRepository } from './infrastructure/repositories/google-calendar-token.repository.js';
import { GoogleCalendarEventRepository } from './infrastructure/repositories/google-calendar-event.repository.js';
import { LivesModule } from '../lives/lives.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [LivesModule, PrismaModule, ConfigModule],
  controllers: [GoogleCalendarController, GoogleOAuthController],
  providers: [
    GoogleCalendarService,
    GoogleOAuthService,
    GoogleCalendarApiService,
    GoogleCalendarTokenRepository,
    GoogleCalendarEventRepository,
  ],
  exports: [GoogleCalendarService, GoogleOAuthService, GoogleCalendarApiService],
})
export class GoogleCalendarModule {}
