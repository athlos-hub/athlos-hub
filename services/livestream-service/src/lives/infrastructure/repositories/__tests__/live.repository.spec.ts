import { Test, TestingModule } from '@nestjs/testing';
import { LiveRepository } from '../live.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LiveStatus } from '../../../domain/enums/live-status.enum';
import { Live } from '../../../domain/entities/live.entity';
import { LiveMapper } from '../../mappers/live.mapper';

describe('LiveRepository', () => {
  let repository: LiveRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaLive = {
    id: '1',
    externalMatchId: 'match-1',
    organizationId: 'org-1',
    streamKey: 'key-1',
    status: 'scheduled',
    startedAt: null,
    endedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockPrisma = {
      live: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<LiveRepository>(LiveRepository);
    prismaService = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a live successfully', async () => {
      prismaService.live.create.mockResolvedValue(mockPrismaLive);

      const result = await repository.create({
        externalMatchId: 'match-1',
        organizationId: 'org-1',
        streamKey: 'key-1',
        status: LiveStatus.SCHEDULED,
      });

      expect(prismaService.live.create).toHaveBeenCalledWith({
        data: {
          externalMatchId: 'match-1',
          organizationId: 'org-1',
          streamKey: 'key-1',
          status: 'scheduled',
        },
      });
      expect(result).toBeInstanceOf(Live);
      expect(result.externalMatchId).toBe('match-1');
    });
  });

  describe('findById', () => {
    it('should find a live by ID', async () => {
      prismaService.live.findUnique.mockResolvedValue(mockPrismaLive);

      const result = await repository.findById('1');

      expect(prismaService.live.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toBeInstanceOf(Live);
      expect(result?.id).toBe('1');
    });

    it('should return null when live not found', async () => {
      prismaService.live.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find lives without filters', async () => {
      prismaService.live.findMany.mockResolvedValue([mockPrismaLive]);

      const result = await repository.findMany();

      expect(prismaService.live.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Live);
    });

    it('should find lives with status filter', async () => {
      prismaService.live.findMany.mockResolvedValue([mockPrismaLive]);

      const result = await repository.findMany({ status: LiveStatus.SCHEDULED });

      expect(prismaService.live.findMany).toHaveBeenCalledWith({
        where: { status: 'scheduled' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should find lives with organizationId filter', async () => {
      prismaService.live.findMany.mockResolvedValue([mockPrismaLive]);

      const result = await repository.findMany({ organizationId: 'org-1' });

      expect(prismaService.live.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should find lives with all filters', async () => {
      prismaService.live.findMany.mockResolvedValue([mockPrismaLive]);

      const result = await repository.findMany({
        status: LiveStatus.SCHEDULED,
        organizationId: 'org-1',
        externalMatchId: 'match-1',
      });

      expect(prismaService.live.findMany).toHaveBeenCalledWith({
        where: {
          status: 'scheduled',
          organizationId: 'org-1',
          externalMatchId: 'match-1',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update live status', async () => {
      const updatedMockLive = { ...mockPrismaLive, status: 'live' };
      prismaService.live.update.mockResolvedValue(updatedMockLive);

      const result = await repository.updateStatus('1', LiveStatus.LIVE);

      expect(prismaService.live.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'live' },
      });
      expect(result).toBeInstanceOf(Live);
      expect(result.status).toBe(LiveStatus.LIVE);
    });
  });

  describe('save', () => {
    it('should save live changes', async () => {
      const live = new Live(
        '1',
        'match-1',
        'org-1',
        'key-1',
        LiveStatus.SCHEDULED,
      );
      const startedAt = new Date();
      live.start(startedAt);

      const updatedMockLive = {
        ...mockPrismaLive,
        status: 'live',
        startedAt,
      };
      prismaService.live.update.mockResolvedValue(updatedMockLive);

      const result = await repository.save(live);

      expect(prismaService.live.update).toHaveBeenCalledWith({
        where: { id: live.id },
        data: {
          status: 'live',
          startedAt: live.startedAt,
          endedAt: live.endedAt,
        },
      });
      expect(result).toBeInstanceOf(Live);
      expect(result.status).toBe(LiveStatus.LIVE);
    });
  });
});
