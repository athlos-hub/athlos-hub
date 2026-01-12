import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EnvService } from '../config/env.service.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private envService: EnvService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.envService.redisHost,
      port: this.envService.redisPort,
      password: this.envService.redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      this.logger.error('Erro no cliente Redis', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Cliente Redis conectado');
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }
}
