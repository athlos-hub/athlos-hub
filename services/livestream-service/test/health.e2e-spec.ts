import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

describe('Health - Integration Tests (e2e)', () => {
  let app: INestApplication;

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test';
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6380');

  beforeAll(async () => {
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
  });

  describe('GET /health - Health Check', () => {
    it('deve retornar status ok', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
      });
    });

    it('deve incluir timestamp na resposta', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
    });

    it('deve retornar em tempo aceitável (<1s)', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });
});
