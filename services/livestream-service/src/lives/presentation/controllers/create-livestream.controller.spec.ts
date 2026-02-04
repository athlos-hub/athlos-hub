import { Test, TestingModule } from '@nestjs/testing';
import { CreateLiveController } from './create-livestream.controller';
import { CreateLiveService } from '../../application/services/create-livestream.service';
import { CreateLiveDto } from '../dto/create-livestream.dto';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';

describe('CreateLiveController', () => {
  let controller: CreateLiveController;
  let service: CreateLiveService;

  const mockCreateLiveService = {
    createLive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreateLiveController],
      providers: [
        {
          provide: CreateLiveService,
          useValue: mockCreateLiveService,
        },
      ],
    }).compile();

    controller = module.get<CreateLiveController>(CreateLiveController);
    service = module.get<CreateLiveService>(CreateLiveService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new live', async () => {
      const dto: CreateLiveDto = {
        externalMatchId: 'match-123',
        organizationId: 'org-456',
      };

      const live = new Live(
        'live-id-1',
        'match-123',
        'org-456',
        'stream-key-abc',
        LiveStatus.SCHEDULED,
      );

      mockCreateLiveService.createLive.mockResolvedValue(live);

      const result = await controller.create(dto);

      expect(result).toEqual({
        id: 'live-id-1',
        externalMatchId: 'match-123',
        organizationId: 'org-456',
        streamKey: 'stream-key-abc',
        status: LiveStatus.SCHEDULED,
        startedAt: null,
        endedAt: null,
        createdAt: expect.any(Date),
      });
      expect(mockCreateLiveService.createLive).toHaveBeenCalledWith(dto);
    });

    it('should call service with correct parameters', async () => {
      const dto: CreateLiveDto = {
        externalMatchId: 'match-789',
        organizationId: 'org-101',
      };

      const live = new Live(
        'live-id-2',
        'match-789',
        'org-101',
        'stream-key-xyz',
        LiveStatus.SCHEDULED,
      );

      mockCreateLiveService.createLive.mockResolvedValue(live);

      await controller.create(dto);

      expect(mockCreateLiveService.createLive).toHaveBeenCalledTimes(1);
      expect(mockCreateLiveService.createLive).toHaveBeenCalledWith({
        externalMatchId: 'match-789',
        organizationId: 'org-101',
      });
    });

    it('should return LiveResponseDto format', async () => {
      const dto: CreateLiveDto = {
        externalMatchId: 'match-123',
        organizationId: 'org-456',
      };

      const live = new Live(
        'live-id-1',
        'match-123',
        'org-456',
        'stream-key-abc',
        LiveStatus.SCHEDULED,
      );

      mockCreateLiveService.createLive.mockResolvedValue(live);

      const result = await controller.create(dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('externalMatchId');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('streamKey');
      expect(result).toHaveProperty('status');
    });
  });
});
