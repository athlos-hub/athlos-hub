import { StreamKeyRepository } from '../stream-key.repository';

describe('StreamKeyRepository', () => {
  let repository: StreamKeyRepository;
  let redisClient: any;

  beforeEach(() => {
    redisClient = {
      setex: jest.fn(),
      get: jest.fn(),
      ttl: jest.fn(),
      del: jest.fn(),
    };

    const redisService = { getClient: jest.fn().mockReturnValue(redisClient) } as any;
    repository = new StreamKeyRepository(redisService);
  });

  it('should save stream key', async () => {
    await repository.save('live-1', 'key-1', 60);

    expect(redisClient.setex).toHaveBeenCalledWith('livestream:streamkey:key-1', 60, 'live-1');
  });

  it('should save with metadata', async () => {
    await repository.saveWithMetadata('key-1', { liveId: 'live-1', organizationId: 'org-1' }, 60);

    expect(redisClient.setex).toHaveBeenCalledWith(
      'livestream:streamkey:key-1',
      60,
      JSON.stringify({ liveId: 'live-1', organizationId: 'org-1' }),
    );
  });

  it('should return metadata when valid json', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify({ liveId: 'live-1', organizationId: 'org-1' }));

    const result = await repository.getMetadata('key-1');

    expect(result).toEqual({ liveId: 'live-1', organizationId: 'org-1' });
  });

  it('should fallback when metadata is plain string', async () => {
    redisClient.get.mockResolvedValue('live-1');

    const result = await repository.getMetadata('key-1');

    expect(result).toEqual({ liveId: 'live-1', organizationId: '' });
  });

  it('should return null when metadata missing', async () => {
    redisClient.get.mockResolvedValue(null);

    const result = await repository.getMetadata('key-1');

    expect(result).toBeNull();
  });

  it('should find live id by stream key', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify({ liveId: 'live-1', organizationId: 'org-1' }));

    const result = await repository.findLiveIdByStreamKey('key-1');

    expect(result).toBe('live-1');
  });

  it('should validate stream key', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify({ liveId: 'live-1', organizationId: 'org-1' }));

    const result = await repository.isValid('key-1');

    expect(result).toBe(true);
  });

  it('should delete keys', async () => {
    await repository.delete('key-1');

    expect(redisClient.del).toHaveBeenCalledWith(
      'livestream:streamkey:key-1',
      'livestream:active:key-1',
    );
  });

  it('should mark active with ttl', async () => {
    redisClient.ttl.mockResolvedValue(120);

    await repository.markAsActive('key-1');

    expect(redisClient.setex).toHaveBeenCalledWith('livestream:active:key-1', 120, '1');
  });

  it('should mark active with default ttl when expired', async () => {
    redisClient.ttl.mockResolvedValue(-1);

    await repository.markAsActive('key-1');

    expect(redisClient.setex).toHaveBeenCalledWith('livestream:active:key-1', 24 * 60 * 60, '1');
  });

  it('should check active status', async () => {
    redisClient.get.mockResolvedValue('1');

    const result = await repository.isActive('key-1');

    expect(result).toBe(true);
  });

  it('should mark inactive', async () => {
    await repository.markAsInactive('key-1');

    expect(redisClient.del).toHaveBeenCalledWith('livestream:active:key-1');
  });
});
