import { Test, TestingModule } from '@nestjs/testing';
import { EventRepository } from '../event.repository';
import { RedisService } from '../../../../redis/redis.service';
import { EventPostgresRepository } from '../event-postgres.repository';
import { MatchEvent } from '../../../domain/entities/match-event.entity';
import { MatchEventType } from '../../../domain/enums/match-event-type.enum';
import { EventTimestamp } from '../../../domain/value-objects/event-timestamp.vo';

describe('EventRepository', () => {
  let repository: EventRepository;
  let redisService: jest.Mocked<RedisService>;
  let postgresRepository: jest.Mocked<EventPostgresRepository>;
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
        EventRepository,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
        {
          provide: EventPostgresRepository,
          useValue: {
            save: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    repository = module.get<EventRepository>(EventRepository);
    redisService = module.get(RedisService);
    postgresRepository = module.get(EventPostgresRepository);
  });

  describe('publishEvent', () => {
    it('should publish an event successfully', async () => {
      const event = MatchEvent.create(
        'event-1',
        'live-1',
        MatchEventType.GOAL,
        { team: 'Home', player: 'Player 1' },
        EventTimestamp.fromDate(new Date()),
      );

      await repository.publishEvent(event);

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'livestream:events:live-1',
        expect.stringContaining('event-1'),
      );
      expect(mockRedisClient.lpush).toHaveBeenCalled();
      expect(mockRedisClient.ltrim).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
      expect(postgresRepository.save).toHaveBeenCalledWith(event);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to events', async () => {
      const liveId = 'live-1';
      const callback = jest.fn();

      await repository.subscribe(liveId, callback);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('livestream:events:live-1');
    });

    it('should handle incoming events', async () => {
      const liveId = 'live-1';
      const callback = jest.fn();
      const eventPayload = {
        id: 'event-1',
        liveId: 'live-1',
        type: MatchEventType.GOAL,
        payload: { team: 'Home' },
        timestamp: new Date().toISOString(),
      };

      let messageHandler: any;
      mockSubscriber.on.mockImplementation((event: string, handler: any) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      await repository.subscribe(liveId, callback);

      messageHandler('livestream:events:live-1', JSON.stringify(eventPayload));

      expect(callback).toHaveBeenCalled();
      const calledEvent = callback.mock.calls[0][0];
      expect(calledEvent).toBeInstanceOf(MatchEvent);
      expect(calledEvent.type).toBe(MatchEventType.GOAL);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from events', async () => {
      const liveId = 'live-1';
      const callback = jest.fn();

      await repository.subscribe(liveId, callback);
      await repository.unsubscribe(liveId);

      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith('livestream:events:live-1');
    });

    it('should do nothing if not subscribed', async () => {
      await repository.unsubscribe('live-1');

      expect(mockSubscriber.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('getRecentEvents', () => {
    it('should retrieve recent events', async () => {
      const eventPayload = {
        id: 'event-1',
        liveId: 'live-1',
        type: MatchEventType.GOAL,
        payload: { team: 'Home' },
        timestamp: new Date().toISOString(),
      };

      mockRedisClient.lrange.mockResolvedValue([JSON.stringify(eventPayload)]);

      const result = await repository.getRecentEvents('live-1', 10);

      expect(mockRedisClient.lrange).toHaveBeenCalledWith(
        'livestream:events:history:live-1',
        0,
        9,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MatchEvent);
      expect(result[0].type).toBe(MatchEventType.GOAL);
    });

    it('should return empty array when no events', async () => {
      mockRedisClient.lrange.mockResolvedValue([]);

      const result = await repository.getRecentEvents('live-1');

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
