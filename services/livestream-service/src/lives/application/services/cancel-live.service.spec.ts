import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CancelLiveService } from './cancel-live.service';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { LiveGateway } from '../../presentation/gateways/live.gateway';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception';

describe('CancelLiveService', () => {
  let service: CancelLiveService;
  let mockLiveRepository: {
    findById: jest.Mock;
    save: jest.Mock;
  };
  let mockLiveGateway: {
    emitLiveStatusChange: jest.Mock;
  };

  beforeEach(async () => {
    mockLiveRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockLiveGateway = {
      emitLiveStatusChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelLiveService,
        {
          provide: 'ILiveRepository',
          useValue: mockLiveRepository,
        },
        {
          provide: LiveGateway,
          useValue: mockLiveGateway,
        },
      ],
    }).compile();

    service = module.get<CancelLiveService>(CancelLiveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should cancel a scheduled live stream', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockLiveRepository.save.mockResolvedValue(live);

      const result = await service.execute(liveId);

      expect(result).toEqual(live);
    });

    it('should emit live status change event', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockLiveRepository.save.mockResolvedValue(live);

      await service.execute(liveId);

      expect(mockLiveGateway.emitLiveStatusChange).toHaveBeenCalledWith(
        liveId,
        'cancelled',
      );
    });

    it('should throw NotFoundException when live not found', async () => {
      const liveId = 'non-existent-live';

      mockLiveRepository.findById.mockResolvedValue(null);

      await expect(service.execute(liveId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.execute(liveId)).rejects.toThrow(
        `Live com id ${liveId} não encontrada`,
      );
    });

    it('should throw InvalidLiveTransitionException when cancelling a live that is already in progress', async () => {
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

      await expect(service.execute(liveId)).rejects.toThrow(
        InvalidLiveTransitionException,
      );
    });

    it('should save the updated live', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockLiveRepository.save.mockResolvedValue(live);

      await service.execute(liveId);

      expect(mockLiveRepository.save).toHaveBeenCalledWith(live);
    });

    it('should not allow cancelling a finished live', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.FINISHED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);

      await expect(service.execute(liveId)).rejects.toThrow(
        InvalidLiveTransitionException,
      );
    });
  });
});
