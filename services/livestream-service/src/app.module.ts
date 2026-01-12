import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { EnvModule } from './config/env.module.js';
import { LivesModule } from './lives/lives.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 3, // 3 requisições
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 20, // 20 requisições
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requisições
      },
    ]),
    EnvModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    LivesModule,
    WebhooksModule,
  ],
})
export class AppModule {}
