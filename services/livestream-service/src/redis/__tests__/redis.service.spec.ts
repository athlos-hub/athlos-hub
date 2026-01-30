import { RedisService } from '../redis.service';

const mockRedisClient = {
  on: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => mockRedisClient),
}));

describe('RedisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize redis client and set listeners', () => {
    const env = {
      redisHost: 'localhost',
      redisPort: 6379,
      redisPassword: 'pass',
    } as any;

    const service = new RedisService(env);

    service.onModuleInit();

    expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(service.getClient()).toBe(mockRedisClient);
  });

  it('should disconnect on module destroy', () => {
    const env = {
      redisHost: 'localhost',
      redisPort: 6379,
      redisPassword: 'pass',
    } as any;

    const service = new RedisService(env);
    service.onModuleInit();

    service.onModuleDestroy();

    expect(mockRedisClient.disconnect).toHaveBeenCalled();
  });
});
