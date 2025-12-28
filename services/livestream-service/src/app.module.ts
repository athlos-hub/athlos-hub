import { Module } from '@nestjs/common';
import { EnvModule } from './config/env.module.js';
import { LivesModule } from './lives/lives.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [EnvModule, PrismaModule, LivesModule],
})
export class AppModule {}
