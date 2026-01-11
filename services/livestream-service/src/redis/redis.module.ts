import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { EnvModule } from '../config/env.module.js';

@Global()
@Module({
  imports: [EnvModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
