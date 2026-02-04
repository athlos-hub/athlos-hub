import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetLiveByIdService } from './get-live-by-id.service';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';

describe('GetLiveByIdService', () => {
  let service: GetLiveByIdService;
  let mockLiveRepository: {
    findById: jest.Mock;
  };

  beforeEach(async () => {
    mockLiveRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLiveByIdService,
        {
          provide: 'ILiveRepository',
          useValue: mockLiveRepository,
        },
      ],
    }).compile();

    service = module.get<GetLiveByIdService>(GetLiveByIdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should return a live by id', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.LIVE,
      );

      mockLiveRepository.findById.mockResolvedValue(live);

      const result = await service.execute(liveId);

      expect(result).toEqual(live);
      expect(mockLiveRepository.findById).toHaveBeenCalledWith(liveId);
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

    it('should return live with correct properties', async () => {
      const liveId = 'live-123';
      const externalMatchId = 'match-456';
      const organizationId = 'org-789';
      const streamKey = 'stream-key-abc';

      const live = new Live(
        liveId,
        externalMatchId,
        organizationId,
        streamKey,
        LiveStatus.SCHEDULED,
      );

      mockLiveRepository.findById.mockResolvedValue(live);

      const result = await service.execute(liveId);

      expect(result.id).toBe(liveId);
      expect(result.externalMatchId).toBe(externalMatchId);
      expect(result.organizationId).toBe(organizationId);
      expect(result.streamKey).toBe(streamKey);
    });
  });
});
