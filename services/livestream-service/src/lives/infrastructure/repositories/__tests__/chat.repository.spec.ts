import { Test, TestingModule } from '@nestjs/testing';
import { ChatRepository } from '../chat.repository';
import { RedisService } from '../../../../redis/redis.service';

describe('ChatRepository', () => {
  let repository: ChatRepository;
  let redisService: jest.Mocked<RedisService>;
  let mockRedisClient: any;
  let mockSubscriber: any;

  beforeEach(async () => {
    mockRedisClient = {
      publish: jest.fn().mockResolvedValue(1),
      lpush: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn().mockResolvedValue('OK'),
      expire: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue([]),
      duplicate: jest.fn(),
    };

    mockSubscriber = {
      subscribe: jest.fn().mockResolvedValue(null),
      unsubscribe: jest.fn().mockResolvedValue(null),
      on: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(null),
    };

    mockRedisClient.duplicate.mockReturnValue(mockSubscriber);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRepository,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    repository = module.get<ChatRepository>(ChatRepository);
    redisService = module.get(RedisService);
  });

  describe('publishMessage', () => {
    it('should publish a chat message successfully', async () => {
      const liveId = 'live-1';
      const message = {
        userId: 'user-1',
        userName: 'Test User',
        message: 'Hello World',
        timestamp: new Date(),
      };

      await repository.publishMessage(liveId, message);

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'livestream:chat:live-1',
        JSON.stringify(message),
      );
      expect(mockRedisClient.lpush).toHaveBeenCalled();
      expect(mockRedisClient.ltrim).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to chat messages', async () => {
      const liveId = 'live-1';
      const callback = jest.fn();

      await repository.subscribe(liveId, callback);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('livestream:chat:live-1');
    });

    it('should handle incoming messages', async () => {
      const liveId = 'live-1';
      const callback = jest.fn();
      const message = {
        userId: 'user-1',
        userName: 'Test User',
        message: 'Hello',
        timestamp: new Date(),
      };

      let messageHandler: any;
      mockSubscriber.on.mockImplementation((event: string, handler: any) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      await repository.subscribe(liveId, callback);

      messageHandler('livestream:chat:live-1', JSON.stringify(message));

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from chat messages', async () => {
      const liveId = 'live-1';
      const callback = jest.fn();

      await repository.subscribe(liveId, callback);
      await repository.unsubscribe(liveId);

      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith('livestream:chat:live-1');
    });

    it('should do nothing if not subscribed', async () => {
      await repository.unsubscribe('live-1');

      expect(mockSubscriber.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('getRecentMessages', () => {
    it('should retrieve recent messages', async () => {
      const liveId = 'live-1';
      const messages = [
        JSON.stringify({
          userId: 'user-1',
          userName: 'User 1',
          message: 'Message 1',
          timestamp: new Date(),
        }),
        JSON.stringify({
          userId: 'user-2',
          userName: 'User 2',
          message: 'Message 2',
          timestamp: new Date(),
        }),
      ];

      mockRedisClient.lrange.mockResolvedValue(messages);

      const result = await repository.getRecentMessages(liveId, 10);

      expect(mockRedisClient.lrange).toHaveBeenCalledWith(
        'livestream:chat:history:live-1',
        0,
        9,
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no messages', async () => {
      mockRedisClient.lrange.mockResolvedValue([]);

      const result = await repository.getRecentMessages('live-1');

      expect(result).toEqual([]);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect subscriber on module destroy', async () => {
      const callback = jest.fn();
      await repository.subscribe('live-1', callback);

      await repository.onModuleDestroy();

      expect(mockSubscriber.disconnect).toHaveBeenCalled();
    });
  });
});
