import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { EnvService } from '../src/config/env.service';

export class TestHelper {
  private static app: INestApplication;
  private static prisma: PrismaClient;
  private static redis: Redis;

  static async createTestApp(): Promise<INestApplication> {
    // Mock EnvService for test environment
    const mockEnvService = {
      databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test',
      port: 3334,
      redisHost: process.env.REDIS_HOST || 'localhost',
      redisPort: parseInt(process.env.REDIS_PORT || '6380'),
      redisPassword: process.env.REDIS_PASSWORD,
      get: jest.fn((key: string) => {
        const env: Record<string, string | number> = {
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test',
          PORT: 3334,
          REDIS_HOST: process.env.REDIS_HOST || 'localhost',
          REDIS_PORT: parseInt(process.env.REDIS_PORT || '6380'),
          KEYCLOAK_REALM: 'test',
          KEYCLOAK_AUTH_SERVER_URL: 'http://localhost:8080',
          KEYCLOAK_CLIENT_ID: 'test-client',
          KEYCLOAK_PUBLIC_KEY: 'test-key',
          AUTH_SERVICE_URL: 'http://localhost:3001',
        };
        return env[key];
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EnvService)
      .useValue(mockEnvService)
      .compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    this.app = app;
    return app;
  }

  static async createPrismaClient(): Promise<PrismaClient> {
    if (!this.prisma) {
      const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test';
      this.prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
      await this.prisma.$connect();
    }
    return this.prisma;
  }

  static async createRedisClient(): Promise<Redis> {
    if (!this.redis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
        password: process.env.REDIS_PASSWORD,
      });
    }
    return this.redis;
  }

  static async cleanDatabase(): Promise<void> {
    const prisma = await this.createPrismaClient();
    
    // Delete in order respecting foreign keys
    await prisma.googleCalendarEvent.deleteMany();
    await prisma.googleCalendarToken.deleteMany();
    await prisma.liveEvent.deleteMany();
    await prisma.live.deleteMany();
  }

  static async cleanRedis(): Promise<void> {
    const redis = await this.createRedisClient();
    await redis.flushdb();
  }

  static async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }

  static getApp(): INestApplication {
    return this.app;
  }

  static getPrisma(): PrismaClient {
    return this.prisma;
  }

  static getRedis(): Redis {
    return this.redis;
  }
}

export async function createLiveInDb(
  prisma: PrismaClient,
  data: {
    id?: string;
    externalMatchId: string;
    organizationId: string;
    streamKey: string;
    status?: 'scheduled' | 'live' | 'finished' | 'cancelled';
  },
) {
  return prisma.live.create({
    data: {
      id: data.id || crypto.randomUUID(),
      externalMatchId: data.externalMatchId,
      organizationId: data.organizationId,
      streamKey: data.streamKey,
      status: data.status || 'scheduled',
    },
  });
}

export async function createStreamKeyMetadata(
  redis: Redis,
  streamKey: string,
  liveId: string,
) {
  const metadata = JSON.stringify({ liveId });
  await redis.set(`stream:${streamKey}`, metadata);
}
