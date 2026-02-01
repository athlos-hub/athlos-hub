import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FinishLiveController } from './finish-live.controller';
import { FinishLiveService } from '../../application/services/finish-live.service';
import { AuthServiceClient } from '../../../auth/services/auth-service-client';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception';

describe('FinishLiveController', () => {
  let controller: FinishLiveController;
  let finishLiveService: FinishLiveService;
  let liveRepo: any;
  let authServiceClient: AuthServiceClient;

  const mockFinishLiveService = {
    execute: jest.fn(),
  };

  const mockLiveRepo = {
    findById: jest.fn(),
  };

  const mockAuthServiceClient = {
    checkOrganizationPermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinishLiveController],
      providers: [
        {
          provide: FinishLiveService,
          useValue: mockFinishLiveService,
        },
        {
          provide: 'ILiveRepository',
          useValue: mockLiveRepo,
        },
        {
          provide: AuthServiceClient,
          useValue: mockAuthServiceClient,
        },
      ],
    }).compile();

    controller = module.get<FinishLiveController>(FinishLiveController);
    finishLiveService = module.get<FinishLiveService>(FinishLiveService);
    liveRepo = mockLiveRepo;
    authServiceClient = module.get<AuthServiceClient>(AuthServiceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('finish', () => {
    const user = { sub: 'user-123', email: 'user@test.com' };
    const liveId = 'live-456';

    it('should finish a live successfully', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockFinishLiveService.execute.mockResolvedValue(live);

      const result = await controller.finish(liveId, user);

      expect(result).toBeDefined();
      expect(mockLiveRepo.findById).toHaveBeenCalledWith(liveId);
      expect(
        mockAuthServiceClient.checkOrganizationPermission,
      ).toHaveBeenCalledWith('user-123', 'org-101');
      expect(mockFinishLiveService.execute).toHaveBeenCalledWith(liveId);
    });

    it('should throw BadRequestException when live not found', async () => {
      mockLiveRepo.findById.mockResolvedValue(null);

      await expect(controller.finish(liveId, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.finish(liveId, user)).rejects.toThrow(
        'Live não encontrada',
      );
    });

    it('should throw UnauthorizedException when user has no permission', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(
        false,
      );

      await expect(controller.finish(liveId, user)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.finish(liveId, user)).rejects.toThrow(
        'Você não tem permissão para finalizar esta live',
      );
    });

    it('should throw BadRequestException on InvalidLiveTransitionException', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockFinishLiveService.execute.mockRejectedValue(
        new InvalidLiveTransitionException(
          LiveStatus.SCHEDULED,
          LiveStatus.FINISHED,
        ),
      );

      await expect(controller.finish(liveId, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate user permission with correct parameters', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-special',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockFinishLiveService.execute.mockResolvedValue(live);

      await controller.finish(liveId, user);

      expect(
        mockAuthServiceClient.checkOrganizationPermission,
      ).toHaveBeenCalledWith('user-123', 'org-special');
    });
  });
});
