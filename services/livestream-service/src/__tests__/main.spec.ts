import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';

let mockApp: {
  setGlobalPrefix: jest.Mock;
  useGlobalPipes: jest.Mock;
  get: jest.Mock;
  listen: jest.Mock;
};

let mockConfigService: {
  get: jest.Mock;
};

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn(() => Promise.resolve(mockApp)),
  },
}));

describe('bootstrap', () => {
  beforeEach(() => {
    mockApp = {
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
      get: jest.fn(),
      listen: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(3000),
    };

    jest.clearAllMocks();
    mockApp.get.mockReturnValue(mockConfigService as unknown as ConfigService);
  });

  it('should initialize app and listen on port', async () => {
    await jest.isolateModulesAsync(async () => {
      await import('../main');
    });

    const { NestFactory } = await import('@nestjs/core');

    expect(NestFactory.create).toHaveBeenCalledWith(expect.any(Function));
    const [[moduleArg]] = (NestFactory.create as jest.Mock).mock.calls;
    expect(moduleArg.name).toBe(AppModule.name);
    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
    const [pipeArg] = mockApp.useGlobalPipes.mock.calls[0];
    expect(pipeArg).toMatchObject({
      transformOptions: { enableImplicitConversion: true },
      validatorOptions: { whitelist: true, forbidNonWhitelisted: false },
    });
    expect(mockConfigService.get).toHaveBeenCalledWith('PORT', { infer: true });
    expect(mockApp.listen).toHaveBeenCalledWith(3000);
  });
});
