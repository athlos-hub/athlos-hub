import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FinishLiveService } from './finish-live.service';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { LiveGateway } from '../../presentation/gateways/live.gateway';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception';

describe('FinishLiveService', () => {
  let service: FinishLiveService;
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
        FinishLiveService,
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

    service = module.get<FinishLiveService>(FinishLiveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should finish a live stream', async () => {
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
      mockLiveRepository.save.mockResolvedValue(live);

      const result = await service.execute(liveId);

      expect(result).toEqual(live);
    });

    it('should change status to FINISHED', async () => {
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
      mockLiveRepository.save.mockImplementation((l: Live) => {
        return Promise.resolve(l);
      });

      await service.execute(liveId);

      expect(mockLiveRepository.save).toHaveBeenCalled();
    });

    it('should emit live status change event', async () => {
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
      mockLiveRepository.save.mockResolvedValue(live);

      await service.execute(liveId);

      expect(mockLiveGateway.emitLiveStatusChange).toHaveBeenCalledWith(
        liveId,
        'finished',
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

    it('should throw InvalidLiveTransitionException when finishing a scheduled live', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.SCHEDULED,
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
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepository.findById.mockResolvedValue(live);
      mockLiveRepository.save.mockResolvedValue(live);

      await service.execute(liveId);

      expect(mockLiveRepository.save).toHaveBeenCalledWith(live);
    });
  });
});
