import { Test, TestingModule } from '@nestjs/testing';
import { ListLivesService } from './list-lives.service';
import { Live } from '../../domain/entities/live.entity';
import { LiveStatus } from '../../domain/enums/live-status.enum';

describe('ListLivesService', () => {
  let service: ListLivesService;
  let mockLiveRepository: {
    findMany: jest.Mock;
  };

  beforeEach(async () => {
    mockLiveRepository = {
      findMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListLivesService,
        {
          provide: 'ILiveRepository',
          useValue: mockLiveRepository,
        },
      ],
    }).compile();

    service = module.get<ListLivesService>(ListLivesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should return all lives when no filters provided', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
        new Live('live-2', 'match-2', 'org-2', 'key-2', LiveStatus.LIVE),
      ];

      mockLiveRepository.findMany.mockResolvedValue(lives);

      const result = await service.execute();

      expect(result).toEqual(lives);
      expect(mockLiveRepository.findMany).toHaveBeenCalledWith(undefined);
    });

    it('should return lives filtered by status', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE),
        new Live('live-2', 'match-2', 'org-2', 'key-2', LiveStatus.LIVE),
      ];

      mockLiveRepository.findMany.mockResolvedValue(lives);

      const result = await service.execute({ status: LiveStatus.LIVE });

      expect(result).toEqual(lives);
      expect(mockLiveRepository.findMany).toHaveBeenCalledWith({
        status: LiveStatus.LIVE,
      });
    });

    it('should return lives filtered by organizationId', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
      ];

      mockLiveRepository.findMany.mockResolvedValue(lives);

      const result = await service.execute({ organizationId: 'org-1' });

      expect(result).toEqual(lives);
      expect(mockLiveRepository.findMany).toHaveBeenCalledWith({
        organizationId: 'org-1',
      });
    });

    it('should return lives filtered by externalMatchId', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED),
      ];

      mockLiveRepository.findMany.mockResolvedValue(lives);

      const result = await service.execute({ externalMatchId: 'match-1' });

      expect(result).toEqual(lives);
      expect(mockLiveRepository.findMany).toHaveBeenCalledWith({
        externalMatchId: 'match-1',
      });
    });

    it('should return lives with multiple filters', async () => {
      const lives = [
        new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE),
      ];

      mockLiveRepository.findMany.mockResolvedValue(lives);

      const result = await service.execute({
        status: LiveStatus.LIVE,
        organizationId: 'org-1',
        externalMatchId: 'match-1',
      });

      expect(result).toEqual(lives);
      expect(mockLiveRepository.findMany).toHaveBeenCalledWith({
        status: LiveStatus.LIVE,
        organizationId: 'org-1',
        externalMatchId: 'match-1',
      });
    });

    it('should return empty array when no lives match filters', async () => {
      mockLiveRepository.findMany.mockResolvedValue([]);

      const result = await service.execute({ status: LiveStatus.FINISHED });

      expect(result).toEqual([]);
    });
  });
});
