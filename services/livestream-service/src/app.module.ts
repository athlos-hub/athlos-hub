import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { EnvModule } from './config/env.module.js';

@Module({
  controllers: [],
  providers: [PrismaService],
  imports: [EnvModule],
})
export class AppModule {}
