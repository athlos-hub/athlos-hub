import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema.js';

@Injectable()
export class EnvService {
  constructor(private config: ConfigService<Env>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.getOrThrow(key);
  }

  get databaseUrl(): string {
    return this.config.getOrThrow('DATABASE_URL');
  }

  get port(): number {
    return this.config.get('PORT', 3333);
  }

  get redisHost(): string {
    return this.config.get('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return this.config.get('REDIS_PORT', 6379);
  }

  get redisPassword(): string | undefined {
    return this.config.get('REDIS_PASSWORD');
  }
}
