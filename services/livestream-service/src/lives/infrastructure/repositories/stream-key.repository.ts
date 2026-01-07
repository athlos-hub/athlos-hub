import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';
import { IStreamKeyRepository } from '../../domain/repositories/stream-key.interface.js';

@Injectable()
export class StreamKeyRepository implements IStreamKeyRepository {
  private readonly STREAM_KEY_PREFIX = 'livestream:streamkey:';
  private readonly ACTIVE_KEY_PREFIX = 'livestream:active:';
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor(private redisService: RedisService) {}

  async save(
    liveId: string,
    streamKey: string,
    ttlInSeconds: number = this.DEFAULT_TTL,
  ): Promise<void> {
    const redis = this.redisService.getClient();
    const key = this.getStreamKeyRedisKey(streamKey);

    await redis.setex(key, ttlInSeconds, liveId);
  }

  async findLiveIdByStreamKey(streamKey: string): Promise<string | null> {
    const redis = this.redisService.getClient();
    const key = this.getStreamKeyRedisKey(streamKey);

    return redis.get(key);
  }

  async isValid(streamKey: string): Promise<boolean> {
    const liveId = await this.findLiveIdByStreamKey(streamKey);
    return liveId !== null;
  }

  async delete(streamKey: string): Promise<void> {
    const redis = this.redisService.getClient();
    const key = this.getStreamKeyRedisKey(streamKey);
    const activeKey = this.getActiveKeyRedisKey(streamKey);

    await redis.del(key, activeKey);
  }

  async markAsActive(streamKey: string): Promise<void> {
    const redis = this.redisService.getClient();
    const activeKey = this.getActiveKeyRedisKey(streamKey);

    const streamKeyKey = this.getStreamKeyRedisKey(streamKey);
    const ttl = await redis.ttl(streamKeyKey);

    if (ttl > 0) {
      await redis.setex(activeKey, ttl, '1');
    } else {
      await redis.setex(activeKey, this.DEFAULT_TTL, '1');
    }
  }

  async isActive(streamKey: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const activeKey = this.getActiveKeyRedisKey(streamKey);

    const result = await redis.get(activeKey);
    return result === '1';
  }

  async markAsInactive(streamKey: string): Promise<void> {
    const redis = this.redisService.getClient();
    const activeKey = this.getActiveKeyRedisKey(streamKey);

    await redis.del(activeKey);
  }

  private getStreamKeyRedisKey(streamKey: string): string {
    return `${this.STREAM_KEY_PREFIX}${streamKey}`;
  }

  private getActiveKeyRedisKey(streamKey: string): string {
    return `${this.ACTIVE_KEY_PREFIX}${streamKey}`;
  }
}
