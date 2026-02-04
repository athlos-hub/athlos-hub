import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PublishMatchEventService } from './publish-match-event.service';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { MatchEvent } from '../../domain/entities/match-event.entity';
import { MatchEventType } from '../../domain/enums/match-event-type.enum';

describe('PublishMatchEventService', () => {
  let service: PublishMatchEventService;
  let mockLiveRepository: {
    findById: jest.Mock;
  };
  let mockEventRepository: {
    publishEvent: jest.Mock;
  };

  beforeEach(async () => {
    mockLiveRepository = {
      findById: jest.fn(),
    };

    mockEventRepository = {
      publishEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishMatchEventService,
        {
          provide: 'ILiveRepository',
          useValue: mockLiveRepository,
        },
        {
          provide: 'IEventRepository',
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    service = module.get<PublishMatchEventService>(PublishMatchEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should publish a match event to a live stream', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockEventRepository.publishEvent.mockResolvedValue(undefined);

      const eventType = MatchEventType.GOAL;
      const payload = { playerName: 'John Doe', minute: 45 };

      const result = await service.execute(liveId, eventType, payload);

      expect(result).toBeInstanceOf(MatchEvent);
      expect(result.liveId).toBe(liveId);
      expect(result.eventType).toBe(eventType);
    });

    it('should throw NotFoundException when live not found', async () => {
      const liveId = 'non-existent-live';

      mockLiveRepository.findById.mockResolvedValue(null);

      const eventType = MatchEventType.GOAL;
      const payload = { playerName: 'John Doe' };

      await expect(
        service.execute(liveId, eventType, payload),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.execute(liveId, eventType, payload),
      ).rejects.toThrow(`Live com id ${liveId} não encontrada`);
    });

    it('should throw BadRequestException when live is not in progress', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);

      const eventType = MatchEventType.GOAL;
      const payload = { playerName: 'John Doe' };

      await expect(
        service.execute(liveId, eventType, payload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save event with correct liveId', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockEventRepository.publishEvent.mockResolvedValue(undefined);

      const eventType = MatchEventType.GOAL;
      const payload = { playerName: 'John Doe', minute: 45 };

      await service.execute(liveId, eventType, payload);

      expect(mockEventRepository.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          liveId,
        }),
      );
    });

    it('should support different match event types', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockEventRepository.publishEvent.mockResolvedValue(undefined);

      const eventTypes = [
        MatchEventType.GOAL,
        MatchEventType.RED_CARD,
        MatchEventType.YELLOW_CARD,
      ];

      for (const eventType of eventTypes) {
        const result = await service.execute(liveId, eventType, {});

        expect(result.eventType).toBe(eventType);
      }
    });

    it('should reject event for finished live', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.FINISHED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);

      const eventType = MatchEventType.GOAL;
      const payload = { playerName: 'John Doe' };

      await expect(
        service.execute(liveId, eventType, payload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject event for cancelled live', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);

      const eventType = MatchEventType.GOAL;
      const payload = { playerName: 'John Doe' };

      await expect(
        service.execute(liveId, eventType, payload),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
