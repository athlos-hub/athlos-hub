import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { EnvModule } from '../config/env.module.js';

@Global()
@Module({
  imports: [EnvModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
