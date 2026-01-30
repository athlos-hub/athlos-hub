import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let redisClient: any;

  beforeEach(async () => {
    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      lpush: jest.fn(),
      rpop: jest.fn(),
      lrange: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      exists: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClient,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get value from redis', async () => {
    redisClient.get.mockResolvedValue('value-123');

    const result = await service.get('key-1');

    expect(result).toBe('value-123');
    expect(redisClient.get).toHaveBeenCalledWith('key-1');
  });

  it('should set value in redis', async () => {
    redisClient.set.mockResolvedValue('OK');

    await service.set('key-1', 'value-123');

    expect(redisClient.set).toHaveBeenCalledWith('key-1', 'value-123');
  });

  it('should set value with expiration', async () => {
    redisClient.set.mockResolvedValue('OK');

    await service.setWithExpire('key-1', 'value-123', 3600);

    expect(redisClient.set).toHaveBeenCalled();
  });

  it('should delete key from redis', async () => {
    redisClient.del.mockResolvedValue(1);

    await service.del('key-1');

    expect(redisClient.del).toHaveBeenCalledWith('key-1');
  });

  it('should check if key exists', async () => {
    redisClient.exists.mockResolvedValue(1);

    const result = await service.exists('key-1');

    expect(result).toBe(1);
  });

  it('should get ttl for key', async () => {
    redisClient.ttl.mockResolvedValue(3600);

    const result = await service.ttl('key-1');

    expect(result).toBe(3600);
  });

  it('should increment counter', async () => {
    redisClient.incr.mockResolvedValue(2);

    const result = await service.increment('counter-1');

    expect(result).toBe(2);
  });

  it('should decrement counter', async () => {
    redisClient.decr.mockResolvedValue(0);

    const result = await service.decrement('counter-1');

    expect(result).toBe(0);
  });

  it('should get hash value', async () => {
    redisClient.hget.mockResolvedValue('field-value');

    const result = await service.hget('hash-1', 'field');

    expect(result).toBe('field-value');
  });

  it('should set hash value', async () => {
    redisClient.hset.mockResolvedValue(1);

    await service.hset('hash-1', 'field', 'value');

    expect(redisClient.hset).toHaveBeenCalled();
  });

  it('should push to list', async () => {
    redisClient.lpush.mockResolvedValue(1);

    await service.lpush('list-1', 'item');

    expect(redisClient.lpush).toHaveBeenCalled();
  });

  it('should pop from list', async () => {
    redisClient.rpop.mockResolvedValue('item');

    const result = await service.rpop('list-1');

    expect(result).toBe('item');
  });

  it('should get list range', async () => {
    redisClient.lrange.mockResolvedValue(['item1', 'item2']);

    const result = await service.lrange('list-1', 0, -1);

    expect(result).toEqual(['item1', 'item2']);
  });

  it('should handle connection errors gracefully', async () => {
    redisClient.get.mockRejectedValue(new Error('Connection failed'));

    await expect(service.get('key-1')).rejects.toThrow('Connection failed');
  });
});
