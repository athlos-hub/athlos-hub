import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { EnvModule } from './config/env.module.js';
import { LivesModule } from './lives/lives.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  imports: [EnvModule, PrismaModule, RedisModule, AuthModule, LivesModule, WebhooksModule],
})
export class AppModule {}
