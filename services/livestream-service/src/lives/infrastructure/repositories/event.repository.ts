import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';
import { IEventRepository } from '../../domain/repositories/event.interface.js';
import { MatchEvent } from '../../domain/entities/match-event.entity.js';
import { MatchEventType } from '../../domain/enums/match-event-type.enum.js';
import { EventTimestamp } from '../../domain/value-objects/event-timestamp.vo.js';
import { EventPostgresRepository } from './event-postgres.repository.js';
import type { Redis } from 'ioredis';

interface EventPayload {
  id: string;
  liveId: string;
  type: MatchEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class EventRepository implements IEventRepository, OnModuleDestroy {
  private readonly logger = new Logger(EventRepository.name);
  private readonly EVENT_CHANNEL_PREFIX = 'livestream:events:';
  private readonly EVENT_HISTORY_PREFIX = 'livestream:events:history:';
  private readonly MAX_HISTORY_EVENTS = 200;
  private readonly HISTORY_TTL = 24 * 60 * 60;

  private subscriber: Redis | null = null;
  private subscriptions = new Map<string, (event: MatchEvent) => void>();

  constructor(
    private redisService: RedisService,
    private postgresRepository: EventPostgresRepository,
  ) {}

  async publishEvent(event: MatchEvent): Promise<void> {
    const redis = this.redisService.getClient();
    const channel = this.getChannelName(event.liveId);

    const payload: EventPayload = {
      id: event.id,
      liveId: event.liveId,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp.toISOString(),
    };

    await redis.publish(channel, JSON.stringify(payload));

    await this.saveEventToHistory(event);

    await this.postgresRepository.save(event);

    this.logger.log(`Evento ${event.type} publicado no canal ${channel} para live ${event.liveId}`);
  }

  async subscribe(liveId: string, callback: (event: MatchEvent) => void): Promise<void> {
    if (!this.subscriber) {
      this.subscriber = this.redisService.getClient().duplicate();

      this.subscriber.on('message', (channel: string, messageStr: string) => {
        const liveIdFromChannel = this.extractLiveIdFromChannel(channel);
        const callback = this.subscriptions.get(liveIdFromChannel);

        if (callback) {
          try {
            const payload = JSON.parse(messageStr) as EventPayload;

            const event = MatchEvent.create(
              payload.id,
              payload.liveId,
              payload.type,
              payload.payload,
              EventTimestamp.fromDate(new Date(payload.timestamp)),
            );

            callback(event);
          } catch (error) {
            this.logger.error(`Erro ao processar evento do canal ${channel}`, error);
          }
        }
      });
    }

    const channel = this.getChannelName(liveId);
    this.subscriptions.set(liveId, callback);

    await this.subscriber.subscribe(channel);
    this.logger.log(`Inscrito no canal de eventos ${channel}`);
  }

  async unsubscribe(liveId: string): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    const channel = this.getChannelName(liveId);
    this.subscriptions.delete(liveId);

    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Desinscrito do canal de eventos ${channel}`);
  }

  async getRecentEvents(liveId: string, limit: number = 50): Promise<MatchEvent[]> {
    const redis = this.redisService.getClient();
    const key = this.getHistoryKey(liveId);

    const events = await redis.lrange(key, 0, limit - 1);

    return events.map((eventStr) => {
      const payload = JSON.parse(eventStr) as EventPayload;

      return MatchEvent.create(
        payload.id,
        payload.liveId,
        payload.type,
        payload.payload,
        EventTimestamp.fromDate(new Date(payload.timestamp)),
      );
    });
  }

  async saveEventToHistory(event: MatchEvent): Promise<void> {
    const redis = this.redisService.getClient();
    const key = this.getHistoryKey(event.liveId);

    const payload: EventPayload = {
      id: event.id,
      liveId: event.liveId,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp.toISOString(),
    };

    await redis.lpush(key, JSON.stringify(payload));

    await redis.ltrim(key, 0, this.MAX_HISTORY_EVENTS - 1);

    await redis.expire(key, this.HISTORY_TTL);
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }

  private getChannelName(liveId: string): string {
    return `${this.EVENT_CHANNEL_PREFIX}${liveId}`;
  }

  private getHistoryKey(liveId: string): string {
    return `${this.EVENT_HISTORY_PREFIX}${liveId}`;
  }

  private extractLiveIdFromChannel(channel: string): string {
    return channel.replace(this.EVENT_CHANNEL_PREFIX, '');
  }
}
