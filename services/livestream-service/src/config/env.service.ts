import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema.js';

@Injectable()
export class EnvService {
  constructor(private config: ConfigService<Env>) {}

  get databaseUrl(): string {
    return this.config.getOrThrow('DATABASE_URL');
  }

  get port(): number {
    return this.config.get('PORT', 3333);
  }
}
