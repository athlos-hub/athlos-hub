import { Module } from '@nestjs/common';
import { EnvModule } from './config/env.module.js';
import { LivesModule } from './lives/lives.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  imports: [EnvModule, PrismaModule, RedisModule, LivesModule, WebhooksModule],
})
export class AppModule {}
