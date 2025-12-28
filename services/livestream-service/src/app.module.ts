import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
