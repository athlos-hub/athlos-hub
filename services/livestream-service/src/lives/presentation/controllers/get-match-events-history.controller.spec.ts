import { Test, TestingModule } from '@nestjs/testing';
import { GetMatchEventsHistoryController } from './get-match-events-history.controller';
import { GetMatchEventsHistoryService } from '../../application/services/get-match-events-history.service';
import { MatchEvent } from '../../domain/entities/match-event.entity';
import { MatchEventType } from '../../domain/enums/match-event-type.enum';

describe('GetMatchEventsHistoryController', () => {
  let controller: GetMatchEventsHistoryController;
  let service: GetMatchEventsHistoryService;

  const mockGetMatchEventsHistoryService = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetMatchEventsHistoryController],
      providers: [
        {
          provide: GetMatchEventsHistoryService,
          useValue: mockGetMatchEventsHistoryService,
        },
      ],
    }).compile();

    controller = module.get<GetMatchEventsHistoryController>(
      GetMatchEventsHistoryController,
    );
    service = module.get<GetMatchEventsHistoryService>(
      GetMatchEventsHistoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEventsHistory', () => {
    it('should return events history without limit', async () => {
      const liveId = 'live-123';
      const events = [
        MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {
          playerName: 'John',
        }),
        MatchEvent.create('event-2', liveId, MatchEventType.YELLOW_CARD, {
          playerName: 'Jane',
        }),
      ];

      mockGetMatchEventsHistoryService.execute.mockResolvedValue(events);

      const result = await controller.getEventsHistory(liveId);

      expect(result).toHaveLength(2);
      expect(mockGetMatchEventsHistoryService.execute).toHaveBeenCalledWith(
        liveId,
        undefined,
      );
    });

    it('should return events history with custom limit', async () => {
      const liveId = 'live-456';
      const events = [
        MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {}),
      ];

      mockGetMatchEventsHistoryService.execute.mockResolvedValue(events);

      const result = await controller.getEventsHistory(liveId, '10');

      expect(result).toHaveLength(1);
      expect(mockGetMatchEventsHistoryService.execute).toHaveBeenCalledWith(
        liveId,
        10,
      );
    });

    it('should parse limit string correctly', async () => {
      const liveId = 'live-789';
      mockGetMatchEventsHistoryService.execute.mockResolvedValue([]);

      await controller.getEventsHistory(liveId, '25');

      expect(mockGetMatchEventsHistoryService.execute).toHaveBeenCalledWith(
        liveId,
        25,
      );
    });

    it('should return empty array when no events', async () => {
      const liveId = 'live-999';

      mockGetMatchEventsHistoryService.execute.mockResolvedValue([]);

      const result = await controller.getEventsHistory(liveId);

      expect(result).toEqual([]);
    });

    it('should return MatchEventResponseDto array format', async () => {
      const liveId = 'live-123';
      const events = [
        MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {
          playerName: 'Player 1',
        }),
      ];

      mockGetMatchEventsHistoryService.execute.mockResolvedValue(events);

      const result = await controller.getEventsHistory(liveId);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('liveId');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('payload');
    });
  });
});
