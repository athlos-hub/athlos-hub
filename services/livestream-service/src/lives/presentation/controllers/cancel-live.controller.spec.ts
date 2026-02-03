import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CancelLiveController } from './cancel-live.controller';
import { CancelLiveService } from '../../application/services/cancel-live.service';
import { AuthServiceClient } from '../../../auth/services/auth-service-client';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception';

describe('CancelLiveController', () => {
  let controller: CancelLiveController;
  let cancelLiveService: CancelLiveService;
  let liveRepo: any;
  let authServiceClient: AuthServiceClient;

  const mockCancelLiveService = {
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
      controllers: [CancelLiveController],
      providers: [
        {
          provide: CancelLiveService,
          useValue: mockCancelLiveService,
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

    controller = module.get<CancelLiveController>(CancelLiveController);
    cancelLiveService = module.get<CancelLiveService>(CancelLiveService);
    liveRepo = mockLiveRepo;
    authServiceClient = module.get<AuthServiceClient>(AuthServiceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('cancel', () => {
    const user = { sub: 'user-123', email: 'user@test.com' };
    const liveId = 'live-456';

    it('should cancel a live successfully', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockCancelLiveService.execute.mockResolvedValue(live);

      const result = await controller.cancel(liveId, user);

      expect(result).toBeDefined();
      expect(mockLiveRepo.findById).toHaveBeenCalledWith(liveId);
      expect(
        mockAuthServiceClient.checkOrganizationPermission,
      ).toHaveBeenCalledWith('user-123', 'org-101');
      expect(mockCancelLiveService.execute).toHaveBeenCalledWith(liveId);
    });

    it('should throw BadRequestException when live not found', async () => {
      mockLiveRepo.findById.mockResolvedValue(null);

      await expect(controller.cancel(liveId, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.cancel(liveId, user)).rejects.toThrow(
        'Live não encontrada',
      );
    });

    it('should throw UnauthorizedException when user has no permission', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(
        false,
      );

      await expect(controller.cancel(liveId, user)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.cancel(liveId, user)).rejects.toThrow(
        'Você não tem permissão para cancelar esta live',
      );
    });

    it('should throw BadRequestException on InvalidLiveTransitionException', async () => {
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
      mockCancelLiveService.execute.mockRejectedValue(
        new InvalidLiveTransitionException(
          LiveStatus.LIVE,
          LiveStatus.CANCELLED,
        ),
      );

      await expect(controller.cancel(liveId, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate user permission with correct parameters', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-special',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockCancelLiveService.execute.mockResolvedValue(live);

      await controller.cancel(liveId, user);

      expect(
        mockAuthServiceClient.checkOrganizationPermission,
      ).toHaveBeenCalledWith('user-123', 'org-special');
    });

    it('should rethrow other errors', async () => {
      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      const customError = new Error('Database connection failed');

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockCancelLiveService.execute.mockRejectedValue(customError);

      await expect(controller.cancel(liveId, user)).rejects.toThrow(
        customError,
      );
    });
  });
});
