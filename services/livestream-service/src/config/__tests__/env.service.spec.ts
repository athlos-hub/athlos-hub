import { ConfigService } from '@nestjs/config';
import { EnvService } from '../env.service';

describe('EnvService', () => {
  let service: EnvService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    } as any;

    service = new EnvService(configService);
  });

  it('should get value using getOrThrow', () => {
    configService.getOrThrow.mockReturnValue('value');

    const result = service.get('DATABASE_URL' as any);

    expect(configService.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    expect(result).toBe('value');
  });

  it('should get database url', () => {
    configService.getOrThrow.mockReturnValue('postgresql://localhost');

    const result = service.databaseUrl;

    expect(configService.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    expect(result).toBe('postgresql://localhost');
  });

  it('should get port with default', () => {
    configService.get.mockReturnValue(3000);

    const result = service.port;

    expect(configService.get).toHaveBeenCalledWith('PORT', 3333);
    expect(result).toBe(3000);
  });

  it('should get redis host with default', () => {
    configService.get.mockReturnValue('redis-server');

    const result = service.redisHost;

    expect(configService.get).toHaveBeenCalledWith('REDIS_HOST', 'localhost');
    expect(result).toBe('redis-server');
  });

  it('should get redis port with default', () => {
    configService.get.mockReturnValue(6380);

    const result = service.redisPort;

    expect(configService.get).toHaveBeenCalledWith('REDIS_PORT', 6379);
    expect(result).toBe(6380);
  });

  it('should get redis password', () => {
    configService.get.mockReturnValue('secret');

    const result = service.redisPassword;

    expect(configService.get).toHaveBeenCalledWith('REDIS_PASSWORD');
    expect(result).toBe('secret');
  });
});
