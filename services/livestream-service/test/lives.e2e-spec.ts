import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

describe('Lives - Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test';
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6380');

  beforeAll(async () => {
    // Create direct database connection for test setup
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await prisma.$connect();

    // Create Redis connection
    redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: process.env.REDIS_PASSWORD,
    });

    // Import modules dynamically to avoid ESM issues
    const { AppModule } = await import('../src/app.module');
    const { EnvService } = await import('../src/config/env.service');

    // Create mock EnvService
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
    // Clean database before each test
    await prisma.liveEvent.deleteMany();
    await prisma.live.deleteMany();
    await redis.flushdb();
  });

  describe('POST /lives - Criar Live', () => {
    it('deve criar uma nova live com sucesso', async () => {
      const createLiveDto = {
        externalMatchId: uuidv4(),
        organizationId: uuidv4(),
      };

      const response = await request(app.getHttpServer())
        .post('/lives')
        .send(createLiveDto)
        .expect(201);

      expect(response.body).toMatchObject({
        externalMatchId: createLiveDto.externalMatchId,
        organizationId: createLiveDto.organizationId,
        status: 'scheduled',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.streamKey).toBeDefined();
      expect(response.body.createdAt).toBeDefined();

      // Verify in database
      const liveInDb = await prisma.live.findUnique({
        where: { id: response.body.id },
      });
      expect(liveInDb).not.toBeNull();
      expect(liveInDb?.externalMatchId).toBe(createLiveDto.externalMatchId);
    });

    it('deve retornar erro 400 quando externalMatchId não é UUID', async () => {
      const createLiveDto = {
        externalMatchId: 'invalid-uuid',
        organizationId: uuidv4(),
      };

      const response = await request(app.getHttpServer())
        .post('/lives')
        .send(createLiveDto)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('externalMatchId')])
      );
    });

    it('deve retornar erro 400 quando organizationId não é UUID', async () => {
      const createLiveDto = {
        externalMatchId: uuidv4(),
        organizationId: 'invalid-uuid',
      };

      const response = await request(app.getHttpServer())
        .post('/lives')
        .send(createLiveDto)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('organizationId')])
      );
    });

    it('deve retornar erro 400 quando campos obrigatórios estão faltando', async () => {
      const response = await request(app.getHttpServer())
        .post('/lives')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('deve retornar erro quando externalMatchId já existe', async () => {
      const externalMatchId = uuidv4();
      const organizationId = uuidv4();

      // Create first live
      await prisma.live.create({
        data: {
          externalMatchId,
          organizationId,
          streamKey: `key-${uuidv4()}`,
          status: 'scheduled',
        },
      });

      // Try to create duplicate - returns 500 because unique constraint violation is not handled
      const response = await request(app.getHttpServer())
        .post('/lives')
        .send({
          externalMatchId,
          organizationId: uuidv4(),
        })
        .expect(500);

      // Error message is returned by Prisma
      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /lives - Listar Lives', () => {
    // Usar UUIDs v4 válidos
    const testOrgId1 = '35ee4efa-6224-4a12-bb2c-e82f1c94b26f';
    const testOrgId2 = 'fee7aad4-2a86-4bf2-a86c-19985f91d00d';

    beforeEach(async () => {
      // Create test lives
      await prisma.live.createMany({
        data: [
          {
            id: uuidv4(),
            externalMatchId: uuidv4(),
            organizationId: testOrgId1,
            streamKey: `key-${uuidv4()}`,
            status: 'scheduled',
          },
          {
            id: uuidv4(),
            externalMatchId: uuidv4(),
            organizationId: testOrgId1,
            streamKey: `key-${uuidv4()}`,
            status: 'live',
          },
          {
            id: uuidv4(),
            externalMatchId: uuidv4(),
            organizationId: testOrgId2,
            streamKey: `key-${uuidv4()}`,
            status: 'finished',
          },
        ],
      });
    });

    it('deve listar todas as lives sem filtros', async () => {
      const response = await request(app.getHttpServer())
        .get('/lives')
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('deve filtrar lives por status', async () => {
      const response = await request(app.getHttpServer())
        .get('/lives')
        .query({ status: 'live' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('live');
    });

    it('deve filtrar lives por organizationId', async () => {
      const response = await request(app.getHttpServer())
        .get('/lives')
        .query({ organizationId: testOrgId1 })
        .expect(200);

      expect(response.body).toHaveLength(2);
      response.body.forEach((live: { organizationId: string }) => {
        expect(live.organizationId).toBe(testOrgId1);
      });
    });

    it('deve filtrar lives por múltiplos parâmetros', async () => {
      const response = await request(app.getHttpServer())
        .get('/lives')
        .query({ status: 'scheduled', organizationId: testOrgId1 })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('scheduled');
      expect(response.body[0].organizationId).toBe(testOrgId1);
    });

    it('deve retornar array vazio quando nenhuma live encontrada', async () => {
      // Usar um UUID v4 válido que não existe no banco
      const response = await request(app.getHttpServer())
        .get('/lives')
        .query({ organizationId: 'c9a7b1e0-8d3f-4a2c-b5e6-1234567890ab' })
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /lives/:id - Obter Live por ID', () => {
    let testLive: { id: string; externalMatchId: string };

    beforeEach(async () => {
      testLive = await prisma.live.create({
        data: {
          externalMatchId: uuidv4(),
          organizationId: uuidv4(),
          streamKey: `key-${uuidv4()}`,
          status: 'scheduled',
        },
      });
    });

    it('deve retornar uma live pelo ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lives/${testLive.id}`)
        .expect(200);

      expect(response.body.id).toBe(testLive.id);
      expect(response.body.externalMatchId).toBe(testLive.externalMatchId);
    });

    it('deve retornar erro 404 quando live não existe', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app.getHttpServer())
        .get(`/lives/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });
});
