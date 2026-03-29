import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { envSchema } from '../../config/env.schema.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

@Controller('__gateway_contract')
@UseGuards(JwtAuthGuard)
class GatewayContractProbeController {
  @Get()
  probe() {
    return { ok: true };
  }
}

describe('Gateway headers contract (HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: (raw: Record<string, unknown>) =>
            envSchema.parse({
              ...raw,
              DATABASE_URL:
                raw.DATABASE_URL ?? 'postgresql://u:p@localhost:5432/t',
              ENV: raw.ENV ?? 'dev',
              TRUST_GATEWAY: raw.TRUST_GATEWAY ?? 'true',
            }),
        }),
      ],
      controllers: [GatewayContractProbeController],
      providers: [JwtAuthGuard],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 without gateway identity headers', () =>
    request(app.getHttpServer()).get('/__gateway_contract').expect(401));

  it('returns 200 with X-Keycloak-Sub', () =>
    request(app.getHttpServer())
      .get('/__gateway_contract')
      .set('X-Keycloak-Sub', 'sub-contract-1')
      .expect(200));
});
