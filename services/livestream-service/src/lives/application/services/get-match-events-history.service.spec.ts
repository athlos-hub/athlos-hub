import { Test, TestingModule } from '@nestjs/testing';
import { GetMatchEventsHistoryService } from './get-match-events-history.service';
import { MatchEvent } from '../../domain/entities/match-event.entity';
import { MatchEventType } from '../../domain/enums/match-event-type.enum';

describe('GetMatchEventsHistoryService', () => {
  let service: GetMatchEventsHistoryService;
  let mockEventRepository: {
    getRecentEvents: jest.Mock;
  };

  beforeEach(async () => {
    mockEventRepository = {
      getRecentEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMatchEventsHistoryService,
        {
          provide: 'IEventRepository',
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    service = module.get<GetMatchEventsHistoryService>(
      GetMatchEventsHistoryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should return recent events without limit', async () => {
      const liveId = 'live-123';
      const events = [
        MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {}),
        MatchEvent.create('event-2', liveId, MatchEventType.GOAL, {}),
        MatchEvent.create(
          'event-3',
          liveId,
          MatchEventType.YELLOW_CARD,
          {},
        ),
      ];

      mockEventRepository.getRecentEvents.mockResolvedValue(events);

      const result = await service.execute(liveId);

      expect(result).toEqual(events);
      expect(mockEventRepository.getRecentEvents).toHaveBeenCalledWith(
        liveId,
        undefined,
      );
    });

    it('should return recent events with limit', async () => {
      const liveId = 'live-123';
      const limit = 10;
      const events = [
        MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {}),
        MatchEvent.create('event-2', liveId, MatchEventType.GOAL, {}),
      ];

      mockEventRepository.getRecentEvents.mockResolvedValue(events);

      const result = await service.execute(liveId, limit);

      expect(result).toEqual(events);
      expect(mockEventRepository.getRecentEvents).toHaveBeenCalledWith(
        liveId,
        limit,
      );
    });

    it('should return empty array when no events found', async () => {
      const liveId = 'live-123';

      mockEventRepository.getRecentEvents.mockResolvedValue([]);

      const result = await service.execute(liveId);

      expect(result).toEqual([]);
    });

    it('should pass liveId to repository', async () => {
      const liveId = 'live-456';

      mockEventRepository.getRecentEvents.mockResolvedValue([]);

      await service.execute(liveId);

      expect(mockEventRepository.getRecentEvents).toHaveBeenCalledWith(
        liveId,
        undefined,
      );
    });

    it('should pass limit parameter to repository', async () => {
      const liveId = 'live-123';
      const limit = 20;

      mockEventRepository.getRecentEvents.mockResolvedValue([]);

      await service.execute(liveId, limit);

      expect(mockEventRepository.getRecentEvents).toHaveBeenCalledWith(
        liveId,
        limit,
      );
    });

    it('should return events in chronological order', async () => {
      const liveId = 'live-123';
      const now = new Date();
      const events = [
        MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {}),
        MatchEvent.create('event-2', liveId, MatchEventType.GOAL, {}),
        MatchEvent.create(
          'event-3',
          liveId,
          MatchEventType.YELLOW_CARD,
          {},
        ),
      ];

      mockEventRepository.getRecentEvents.mockResolvedValue(events);

      const result = await service.execute(liveId);

      expect(result.length).toBe(3);
      expect(result).toEqual(events);
    });

    it('should respect limit when retrieving events', async () => {
      const liveId = 'live-123';
      const limit = 5;
      const events = Array.from({ length: 5 }, (_, i) =>
        MatchEvent.create(`event-${i}`, liveId, MatchEventType.GOAL, {}),
      );

      mockEventRepository.getRecentEvents.mockResolvedValue(events);

      const result = await service.execute(liveId, limit);

      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });
});
