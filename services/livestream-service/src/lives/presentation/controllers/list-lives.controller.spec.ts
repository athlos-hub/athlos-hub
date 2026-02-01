import { Test, TestingModule } from '@nestjs/testing';
import { ListLivesController } from './list-lives.controller';
import { ListLivesService } from '../../application/services/list-lives.service';
import { ListLivesDto } from '../dto/list-lives.dto';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';

describe('ListLivesController', () => {
  let controller: ListLivesController;
  let service: ListLivesService;

  const mockListLivesService = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListLivesController],
      providers: [
        {
          provide: ListLivesService,
          useValue: mockListLivesService,
        },
      ],
    }).compile();

    controller = module.get<ListLivesController>(ListLivesController);
    service = module.get<ListLivesService>(ListLivesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return all lives without filters', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
        new Live('live-2', 'match-2', 'org-2', 'key-2', LiveStatus.LIVE),
      ];

      mockListLivesService.execute.mockResolvedValue(lives);

      const query: ListLivesDto = {};
      const result = await controller.list(query);

      expect(result).toHaveLength(2);
      expect(mockListLivesService.execute).toHaveBeenCalledWith({
        status: undefined,
        organizationId: undefined,
        externalMatchId: undefined,
      });
    });

    it('should filter lives by status', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE),
      ];

      mockListLivesService.execute.mockResolvedValue(lives);

      const query: ListLivesDto = { status: LiveStatus.LIVE };
      const result = await controller.list(query);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LiveStatus.LIVE);
      expect(mockListLivesService.execute).toHaveBeenCalledWith({
        status: LiveStatus.LIVE,
        organizationId: undefined,
        externalMatchId: undefined,
      });
    });

    it('should filter lives by organizationId', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
      ];

      mockListLivesService.execute.mockResolvedValue(lives);

      const query: ListLivesDto = { organizationId: 'org-1' };
      const result = await controller.list(query);

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe('org-1');
      expect(mockListLivesService.execute).toHaveBeenCalledWith({
        status: undefined,
        organizationId: 'org-1',
        externalMatchId: undefined,
      });
    });

    it('should filter lives by externalMatchId', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
      ];

      mockListLivesService.execute.mockResolvedValue(lives);

      const query: ListLivesDto = { externalMatchId: 'match-1' };
      const result = await controller.list(query);

      expect(result).toHaveLength(1);
      expect(result[0].externalMatchId).toBe('match-1');
      expect(mockListLivesService.execute).toHaveBeenCalledWith({
        status: undefined,
        organizationId: undefined,
        externalMatchId: 'match-1',
      });
    });

    it('should filter lives with multiple filters', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE),
      ];

      mockListLivesService.execute.mockResolvedValue(lives);

      const query: ListLivesDto = {
        status: LiveStatus.LIVE,
        organizationId: 'org-1',
        externalMatchId: 'match-1',
      };
      const result = await controller.list(query);

      expect(result).toHaveLength(1);
      expect(mockListLivesService.execute).toHaveBeenCalledWith({
        status: LiveStatus.LIVE,
        organizationId: 'org-1',
        externalMatchId: 'match-1',
      });
    });

    it('should return empty array when no lives found', async () => {
      mockListLivesService.execute.mockResolvedValue([]);

      const query: ListLivesDto = { status: LiveStatus.FINISHED };
      const result = await controller.list(query);

      expect(result).toEqual([]);
    });

    it('should return LiveResponseDto array format', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
      ];

      mockListLivesService.execute.mockResolvedValue(lives);

      const query: ListLivesDto = {};
      const result = await controller.list(query);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('externalMatchId');
      expect(result[0]).toHaveProperty('organizationId');
      expect(result[0]).toHaveProperty('streamKey');
      expect(result[0]).toHaveProperty('status');
    });
  });
});
