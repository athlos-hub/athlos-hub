import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';
import { IChatRepository } from '../../domain/repositories/chat.interface.js';
import type { Redis } from 'ioredis';

interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

@Injectable()
export class ChatRepository implements IChatRepository, OnModuleDestroy {
  private readonly logger = new Logger(ChatRepository.name);
  private readonly CHAT_CHANNEL_PREFIX = 'livestream:chat:';
  private readonly CHAT_HISTORY_PREFIX = 'livestream:chat:history:';
  private readonly MAX_HISTORY_MESSAGES = 100;
  private readonly HISTORY_TTL = 24 * 60 * 60;

  private subscriber: Redis | null = null;
  private subscriptions = new Map<string, (message: ChatMessage) => void>();

  constructor(private redisService: RedisService) {}

  async publishMessage(liveId: string, message: ChatMessage): Promise<void> {
    const redis = this.redisService.getClient();
    const channel = this.getChannelName(liveId);

    await redis.publish(channel, JSON.stringify(message));

    await this.saveMessageToHistory(liveId, message);

    this.logger.log(`Mensagem publicada no canal ${channel}`);
  }

  async subscribe(liveId: string, callback: (message: ChatMessage) => void): Promise<void> {
    if (!this.subscriber) {
      this.subscriber = this.redisService.getClient().duplicate();

      this.subscriber.on('message', (channel: string, messageStr: string) => {
        const liveIdFromChannel = this.extractLiveIdFromChannel(channel);
        const callback = this.subscriptions.get(liveIdFromChannel);

        if (callback) {
          try {
            const message = JSON.parse(messageStr) as ChatMessage;

            message.timestamp = new Date(message.timestamp);
            callback(message);
          } catch (error) {
            this.logger.error(`Erro ao processar mensagem do canal ${channel}`, error);
          }
        }
      });
    }

    const channel = this.getChannelName(liveId);
    this.subscriptions.set(liveId, callback);

    await this.subscriber.subscribe(channel);
    this.logger.log(`Inscrito no canal ${channel}`);
  }

  async unsubscribe(liveId: string): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    const channel = this.getChannelName(liveId);
    this.subscriptions.delete(liveId);

    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Desinscrito do canal ${channel}`);
  }

  async getRecentMessages(liveId: string, limit: number = 50): Promise<ChatMessage[]> {
    const redis = this.redisService.getClient();
    const key = this.getHistoryKey(liveId);

    const messages = await redis.lrange(key, 0, limit - 1);

    return messages.map((messageStr) => {
      const message = JSON.parse(messageStr) as ChatMessage;
      message.timestamp = new Date(message.timestamp);
      return message;
    });
  }

  async saveMessageToHistory(liveId: string, message: ChatMessage): Promise<void> {
    const redis = this.redisService.getClient();
    const key = this.getHistoryKey(liveId);

    await redis.lpush(key, JSON.stringify(message));

    await redis.ltrim(key, 0, this.MAX_HISTORY_MESSAGES - 1);

    await redis.expire(key, this.HISTORY_TTL);
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }

  private getChannelName(liveId: string): string {
    return `${this.CHAT_CHANNEL_PREFIX}${liveId}`;
  }

  private getHistoryKey(liveId: string): string {
    return `${this.CHAT_HISTORY_PREFIX}${liveId}`;
  }

  private extractLiveIdFromChannel(channel: string): string {
    return channel.replace(this.CHAT_CHANNEL_PREFIX, '');
  }
}
