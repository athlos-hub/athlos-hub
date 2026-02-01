import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PublishMatchEventController } from './publish-match-event.controller';
import { PublishMatchEventService } from '../../application/services/publish-match-event.service';
import { AuthServiceClient } from '../../../auth/services/auth-service-client';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';
import { MatchEvent } from '../../domain/entities/match-event.entity';
import { MatchEventType } from '../../domain/enums/match-event-type.enum';
import { PublishMatchEventDto } from '../dto/publish-match-event.dto';

describe('PublishMatchEventController', () => {
  let controller: PublishMatchEventController;
  let publishMatchEventService: PublishMatchEventService;
  let liveRepo: any;
  let authServiceClient: AuthServiceClient;

  const mockPublishMatchEventService = {
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
      controllers: [PublishMatchEventController],
      providers: [
        {
          provide: PublishMatchEventService,
          useValue: mockPublishMatchEventService,
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

    controller = module.get<PublishMatchEventController>(
      PublishMatchEventController,
    );
    publishMatchEventService = module.get<PublishMatchEventService>(
      PublishMatchEventService,
    );
    liveRepo = mockLiveRepo;
    authServiceClient = module.get<AuthServiceClient>(AuthServiceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('publishEvent', () => {
    const user = { sub: 'user-123', email: 'user@test.com' };
    const liveId = 'live-456';

    it('should publish an event successfully', async () => {
      const dto: PublishMatchEventDto = {
        type: MatchEventType.GOAL,
        payload: { playerName: 'John Doe', minute: 45 },
      };

      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      const event = MatchEvent.create(
        'event-1',
        liveId,
        MatchEventType.GOAL,
        dto.payload,
      );

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockPublishMatchEventService.execute.mockResolvedValue(event);

      const result = await controller.publishEvent(liveId, dto, user);

      expect(result).toBeDefined();
      expect(mockLiveRepo.findById).toHaveBeenCalledWith(liveId);
      expect(
        mockAuthServiceClient.checkOrganizationPermission,
      ).toHaveBeenCalledWith('user-123', 'org-101');
      expect(mockPublishMatchEventService.execute).toHaveBeenCalledWith(
        liveId,
        dto.type,
        dto.payload,
      );
    });

    it('should throw BadRequestException when live not found', async () => {
      const dto: PublishMatchEventDto = {
        type: MatchEventType.GOAL,
        payload: {},
      };

      mockLiveRepo.findById.mockResolvedValue(null);

      await expect(
        controller.publishEvent(liveId, dto, user),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.publishEvent(liveId, dto, user),
      ).rejects.toThrow('Live não encontrada');
    });

    it('should throw UnauthorizedException when user has no permission', async () => {
      const dto: PublishMatchEventDto = {
        type: MatchEventType.GOAL,
        payload: {},
      };

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

      await expect(
        controller.publishEvent(liveId, dto, user),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.publishEvent(liveId, dto, user),
      ).rejects.toThrow(
        'Você não tem permissão para publicar eventos nesta live',
      );
    });

    it('should publish different event types', async () => {
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

      const eventTypes = [
        MatchEventType.GOAL,
        MatchEventType.YELLOW_CARD,
        MatchEventType.RED_CARD,
      ];

      for (const eventType of eventTypes) {
        const dto: PublishMatchEventDto = {
          type: eventType,
          payload: {},
        };

        const event = MatchEvent.create('event-1', liveId, eventType, {});
        mockPublishMatchEventService.execute.mockResolvedValue(event);

        await controller.publishEvent(liveId, dto, user);

        expect(mockPublishMatchEventService.execute).toHaveBeenCalledWith(
          liveId,
          eventType,
          {},
        );
      }
    });

    it('should validate user permission with correct parameters', async () => {
      const dto: PublishMatchEventDto = {
        type: MatchEventType.GOAL,
        payload: {},
      };

      const live = new Live(
        liveId,
        'match-789',
        'org-special',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      const event = MatchEvent.create('event-1', liveId, MatchEventType.GOAL, {});

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockPublishMatchEventService.execute.mockResolvedValue(event);

      await controller.publishEvent(liveId, dto, user);

      expect(
        mockAuthServiceClient.checkOrganizationPermission,
      ).toHaveBeenCalledWith('user-123', 'org-special');
    });

    it('should return MatchEventResponseDto format', async () => {
      const dto: PublishMatchEventDto = {
        type: MatchEventType.GOAL,
        payload: { playerName: 'Player 1' },
      };

      const live = new Live(
        liveId,
        'match-789',
        'org-101',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      const event = MatchEvent.create('event-1', liveId, MatchEventType.GOAL, dto.payload);

      mockLiveRepo.findById.mockResolvedValue(live);
      mockAuthServiceClient.checkOrganizationPermission.mockResolvedValue(true);
      mockPublishMatchEventService.execute.mockResolvedValue(event);

      const result = await controller.publishEvent(liveId, dto, user);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('liveId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('payload');
    });
  });
});
