import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { EnvModule } from './config/env.module.js';
import { LivesModule } from './lives/lives.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module.js';
import { HealthController } from './health/presentation/controllers/health.controller.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, 
        limit: 3, 
      },
      {
        name: 'medium',
        ttl: 10000, 
        limit: 20, 
      },
      {
        name: 'long',
        ttl: 60000, 
        limit: 100, 
      },
    ]),
    EnvModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    LivesModule,
    WebhooksModule,
    GoogleCalendarModule,
  ],
  controllers: [
    HealthController
  ],
})
export class AppModule {}