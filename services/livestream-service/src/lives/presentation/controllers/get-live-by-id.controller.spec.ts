import { Test, TestingModule } from '@nestjs/testing';
import { GetLiveByIdController } from './get-live-by-id.controller';
import { GetLiveByIdService } from '../../application/services/get-live-by-id.service';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { NotFoundException } from '@nestjs/common';

describe('GetLiveByIdController', () => {
  let controller: GetLiveByIdController;
  let service: GetLiveByIdService;

  const mockGetLiveByIdService = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetLiveByIdController],
      providers: [
        {
          provide: GetLiveByIdService,
          useValue: mockGetLiveByIdService,
        },
      ],
    }).compile();

    controller = module.get<GetLiveByIdController>(GetLiveByIdController);
    service = module.get<GetLiveByIdService>(GetLiveByIdService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getById', () => {
    it('should return a live by id', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockGetLiveByIdService.execute.mockResolvedValue(live);

      const result = await controller.getById(liveId);

      expect(result).toEqual({
        id: liveId,
        externalMatchId: 'match-456',
        organizationId: 'org-789',
        streamKey: 'stream-key',
        status: LiveStatus.LIVE,
        startedAt: expect.any(Date),
        endedAt: null,
        createdAt: expect.any(Date),
      });
      expect(mockGetLiveByIdService.execute).toHaveBeenCalledWith(liveId);
    });

    it('should throw NotFoundException when live not found', async () => {
      const liveId = 'non-existent';

      mockGetLiveByIdService.execute.mockRejectedValue(
        new NotFoundException(`Live com id ${liveId} não encontrada`),
      );

      await expect(controller.getById(liveId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call service with correct id', async () => {
      const liveId = 'live-999';
      const live = new Live(
        liveId,
        'match-111',
        'org-222',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockGetLiveByIdService.execute.mockResolvedValue(live);

      await controller.getById(liveId);

      expect(mockGetLiveByIdService.execute).toHaveBeenCalledTimes(1);
      expect(mockGetLiveByIdService.execute).toHaveBeenCalledWith(liveId);
    });

    it('should return LiveResponseDto format', async () => {
      const liveId = 'live-123';
      const live = new Live(
        liveId,
        'match-456',
        'org-789',
        'stream-key',
        LiveStatus.FINISHED,
      );

      mockGetLiveByIdService.execute.mockResolvedValue(live);

      const result = await controller.getById(liveId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('externalMatchId');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('streamKey');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('endedAt');
      expect(result).toHaveProperty('createdAt');
    });
  });
});
