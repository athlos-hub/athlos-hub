import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

describe('Webhooks - Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test';
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6380');

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await prisma.$connect();

    redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: process.env.REDIS_PASSWORD,
    });

    const { AppModule } = await import('../src/app.module');
    const { EnvService } = await import('../src/config/env.service');

    const mockEnvService = {
      databaseUrl,
      port: 3334,
      redisHost,
      redisPort,
      redisPassword: process.env.REDIS_PASSWORD,
      get: (key: string) => {
        const env: Record<string, string | number | undefined> = {
          DATABASE_URL: databaseUrl,
          PORT: 3334,
          REDIS_HOST: redisHost,
          REDIS_PORT: redisPort,
          KEYCLOAK_REALM: 'test',
          KEYCLOAK_AUTH_SERVER_URL: 'http://localhost:8080',
          KEYCLOAK_CLIENT_ID: 'test-client',
          KEYCLOAK_PUBLIC_KEY: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest',
          AUTH_SERVICE_URL: 'http://localhost:3001',
        };
        return env[key];
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EnvService)
      .useValue(mockEnvService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await redis?.quit();
  });

  beforeEach(async () => {
    await prisma.liveEvent.deleteMany();
    await prisma.live.deleteMany();
    await redis.flushdb();
  });

  describe('POST /webhooks/mediamtx-auth - Autenticação de Stream', () => {
    let testLive: { id: string; streamKey: string; organizationId: string };

    beforeEach(async () => {
      const streamKey = `test-stream-${uuidv4()}`;
      const organizationId = uuidv4();
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId,
          streamKey,
          status: 'scheduled',
        },
      });

      // Store stream key metadata in Redis using correct key format
      await redis.setex(
        `livestream:streamkey:${streamKey}`,
        86400,
        JSON.stringify({ liveId: testLive.id, organizationId }),
      );
    });

    it('deve autenticar ação publish com stream key válida', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: `/live/${testLive.streamKey}`,
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(200);

      // Verify live was started
      const updatedLive = await prisma.live.findUnique({
        where: { id: testLive.id },
      });
      expect(updatedLive?.status).toBe('live');
      expect(updatedLive?.startedAt).not.toBeNull();
    });

    it('deve permitir ação read sem validação', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'read',
          path: `/live/${testLive.streamKey}`,
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(200);
    });

    it('deve rejeitar stream key inválida', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: '/live/invalid-stream-key',
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(401);
    });

    it('deve rejeitar stream key vazia', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: '/live/',
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(401);
    });

    it('deve extrair stream key corretamente de path com query string', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: `/live/${testLive.streamKey}?token=abc`,
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(200);
    });

    it('deve rejeitar live já finalizada', async () => {
      // Update live to finished status
      await prisma.live.update({
        where: { id: testLive.id },
        data: { status: 'finished', endedAt: new Date() },
      });

      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: `/live/${testLive.streamKey}`,
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(401);
    });

    it('deve rejeitar live cancelada', async () => {
      await prisma.live.update({
        where: { id: testLive.id },
        data: { status: 'cancelled', endedAt: new Date() },
      });

      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: `/live/${testLive.streamKey}`,
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(401);
    });

    it('deve permitir reconexão de live já ao vivo', async () => {
      // Update live to live status (simulating reconnection)
      await prisma.live.update({
        where: { id: testLive.id },
        data: { status: 'live', startedAt: new Date() },
      });

      await request(app.getHttpServer())
        .post('/webhooks/mediamtx-auth')
        .send({
          action: 'publish',
          path: `/live/${testLive.streamKey}`,
          ip: '127.0.0.1',
          protocol: 'rtmp',
        })
        .expect(200);
    });
  });

  describe('POST /webhooks/on-publish-done - Stream Finalizada', () => {
    let testLive: { id: string; streamKey: string };
    let organizationId: string;

    beforeEach(async () => {
      const streamKey = `test-stream-${uuidv4()}`;
      organizationId = uuidv4();
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId,
          streamKey,
          status: 'live',
          startedAt: new Date(),
        },
      });

      // Usar o prefixo correto: livestream:streamkey:
      await redis.setex(
        `livestream:streamkey:${streamKey}`,
        86400,
        JSON.stringify({ liveId: testLive.id, organizationId }),
      );
    });

    it('deve finalizar live automaticamente quando stream termina', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/on-publish-done')
        .send({
          path: `/${testLive.streamKey}`,
        })
        .expect(200);

      // Verify live was finished
      const updatedLive = await prisma.live.findUnique({
        where: { id: testLive.id },
      });
      expect(updatedLive?.status).toBe('finished');
      expect(updatedLive?.endedAt).not.toBeNull();
    });

    it('deve ignorar stream key vazia', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/on-publish-done')
        .send({
          path: '/',
        })
        .expect(200);
    });

    it('deve ignorar stream key inexistente (sem erro)', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/on-publish-done')
        .send({
          path: '/unknown-stream-key',
        })
        .expect(200);
    });

    it('deve ignorar live já finalizada', async () => {
      await prisma.live.update({
        where: { id: testLive.id },
        data: { status: 'finished', endedAt: new Date() },
      });

      await request(app.getHttpServer())
        .post('/webhooks/on-publish-done')
        .send({
          path: `/${testLive.streamKey}`,
        })
        .expect(200);
    });

    it('deve ignorar live agendada (não iniciada)', async () => {
      await prisma.live.update({
        where: { id: testLive.id },
        data: { status: 'scheduled', startedAt: null },
      });

      await request(app.getHttpServer())
        .post('/webhooks/on-publish-done')
        .send({
          path: `/${testLive.streamKey}`,
        })
        .expect(200);

      // Verify live was NOT changed
      const updatedLive = await prisma.live.findUnique({
        where: { id: testLive.id },
      });
      expect(updatedLive?.status).toBe('scheduled');
    });
  });
});
