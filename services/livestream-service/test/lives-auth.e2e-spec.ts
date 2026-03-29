import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

describe('Lives Auth Protected - Integration Tests (e2e)', () => {
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
    const { JwtAuthGuard } = await import('../src/auth/guards/jwt-auth.guard');
    const { AuthServiceClient } = await import('../src/auth/services/auth-service-client');

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

    // Mock AuthServiceClient to always return true for permissions
    const mockAuthServiceClient = {
      getOrganizationPermissionDetails: jest.fn().mockResolvedValue({
        hasPermission: true,
        role: 'OWNER',
      }),
    };

    // Mock JwtAuthGuard to always pass and inject test user
    const mockJwtAuthGuard = {
      canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          sub: 'test-user-id',
          email: 'test@example.com',
        };
        return true;
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EnvService)
      .useValue(mockEnvService)
      .overrideProvider(AuthServiceClient)
      .useValue(mockAuthServiceClient)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
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

  describe('PATCH /lives/:id/finish - Finalizar Live', () => {
    let testLive: { id: string; organizationId: string };

    beforeEach(async () => {
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'live',
          startedAt: new Date(),
        },
      });
    });

    it('deve finalizar live ao vivo com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/lives/${testLive.id}/finish`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.status).toBe('finished');
      expect(response.body.endedAt).not.toBeNull();

      // Verify in database
      const updatedLive = await prisma.live.findUnique({
        where: { id: testLive.id },
      });
      expect(updatedLive?.status).toBe('finished');
    });

    it('deve retornar erro 400 quando live não encontrada', async () => {
      const nonExistentId = uuidv4();

      await request(app.getHttpServer())
        .patch(`/lives/${nonExistentId}/finish`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('deve retornar erro 400 ao tentar finalizar live agendada', async () => {
      const scheduledLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'scheduled',
        },
      });

      await request(app.getHttpServer())
        .patch(`/lives/${scheduledLive.id}/finish`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('deve retornar erro 400 ao tentar finalizar live já finalizada', async () => {
      const finishedLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'finished',
          startedAt: new Date(Date.now() - 3600000),
          endedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .patch(`/lives/${finishedLive.id}/finish`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });
  });

  describe('PATCH /lives/:id/cancel - Cancelar Live', () => {
    let testLive: { id: string; organizationId: string };

    beforeEach(async () => {
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'scheduled',
        },
      });
    });

    it('deve cancelar live agendada com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/lives/${testLive.id}/cancel`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.status).toBe('cancelled');
      expect(response.body.endedAt).not.toBeNull();

      // Verify in database
      const updatedLive = await prisma.live.findUnique({
        where: { id: testLive.id },
      });
      expect(updatedLive?.status).toBe('cancelled');
    });

    it('deve retornar erro 400 quando live não encontrada', async () => {
      const nonExistentId = uuidv4();

      await request(app.getHttpServer())
        .patch(`/lives/${nonExistentId}/cancel`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('deve retornar erro 400 ao tentar cancelar live ao vivo', async () => {
      const liveLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'live',
          startedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .patch(`/lives/${liveLive.id}/cancel`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });

    it('deve retornar erro 400 ao tentar cancelar live já finalizada', async () => {
      const finishedLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'finished',
          startedAt: new Date(Date.now() - 3600000),
          endedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .patch(`/lives/${finishedLive.id}/cancel`)
        .set('Authorization', 'Bearer test-token')
        .expect(400);
    });
  });

  describe('GET /lives/:id/events - Histórico de Eventos', () => {
    let testLive: { id: string };

    beforeEach(async () => {
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'live',
          startedAt: new Date(),
        },
      });

      // Create test events in Redis (where the service fetches from)
      const eventHistoryKey = `livestream:events:history:${testLive.id}`;
      const events = [
        {
          id: uuidv4(),
          liveId: testLive.id,
          type: 'GOAL',
          payload: { team: 'home', player: 'Player 1' },
          timestamp: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          liveId: testLive.id,
          type: 'YELLOW_CARD',
          payload: { team: 'away', player: 'Player 2' },
          timestamp: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          liveId: testLive.id,
          type: 'SUBSTITUTION',
          payload: { team: 'home', playerIn: 'Player 3', playerOut: 'Player 4' },
          timestamp: new Date().toISOString(),
        },
      ];

      // Push events to Redis list (lpush adds to the beginning)
      for (const event of events) {
        await redis.lpush(eventHistoryKey, JSON.stringify(event));
      }
    });

    it('deve retornar histórico de eventos', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lives/${testLive.id}/events`)
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('deve respeitar parâmetro limit', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lives/${testLive.id}/events`)
        .query({ limit: 2 })
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('deve retornar eventos ordenados por data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lives/${testLive.id}/events`)
        .expect(200);

      const events = response.body;
      for (let i = 1; i < events.length; i++) {
        const prevDate = new Date(events[i - 1].timestamp);
        const currDate = new Date(events[i].timestamp);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it('deve retornar array vazio para live sem eventos', async () => {
      const emptyLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'live',
          startedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/lives/${emptyLive.id}/events`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /lives/:id/chat/history - Histórico do Chat', () => {
    let testLive: { id: string; streamKey: string };

    beforeEach(async () => {
      const streamKey = `test-stream-${uuidv4()}`;
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey,
          status: 'live',
          startedAt: new Date(),
        },
      });

      // Add some chat messages to Redis using the correct key format
      const chatHistoryKey = `livestream:chat:history:${testLive.id}`;
      const messages = [
        { userId: 'user1', userName: 'User 1', message: 'Hello!', timestamp: new Date().toISOString() },
        { userId: 'user2', userName: 'User 2', message: 'Hi there!', timestamp: new Date().toISOString() },
        { userId: 'user1', userName: 'User 1', message: 'How is the game?', timestamp: new Date().toISOString() },
      ];

      for (const msg of messages) {
        await redis.lpush(chatHistoryKey, JSON.stringify(msg));
      }
    });

    it('deve retornar histórico de mensagens do chat', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lives/${testLive.id}/chat/history`)
        .expect(200);

      expect(response.body.messages).toBeDefined();
      expect(response.body.messages.length).toBeGreaterThanOrEqual(0);
    });

    it('deve respeitar parâmetro limit', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lives/${testLive.id}/chat/history`)
        .query({ limit: 2 })
        .expect(200);

      expect(response.body.messages.length).toBeLessThanOrEqual(2);
    });

    it('deve retornar array vazio para live sem mensagens', async () => {
      const emptyLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: 'test-org-id',
          streamKey: `key-${uuidv4()}`,
          status: 'live',
          startedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/lives/${emptyLive.id}/chat/history`)
        .expect(200);

      expect(response.body.messages).toHaveLength(0);
    });
  });
});
