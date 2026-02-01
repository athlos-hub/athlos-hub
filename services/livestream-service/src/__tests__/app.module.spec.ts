import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';
import { AuthModule } from '../auth/auth.module';
import { EnvModule } from '../config/env.module';
import { LivesModule } from '../lives/lives.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { HealthController } from '../health/presentation/controllers/health.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AppModule', () => {
  it('should register imports and controllers', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as any[];
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule) as any[];

    expect(imports).toEqual(
      expect.arrayContaining([
        EnvModule,
        PrismaModule,
        RedisModule,
        AuthModule,
        LivesModule,
        WebhooksModule,
        GoogleCalendarModule,
      ]),
    );

    expect(imports.some((item) => item?.module === ScheduleModule)).toBe(true);
    expect(imports.some((item) => item?.module === ThrottlerModule)).toBe(true);

    expect(controllers).toEqual(expect.arrayContaining([HealthController]));
  });
});
