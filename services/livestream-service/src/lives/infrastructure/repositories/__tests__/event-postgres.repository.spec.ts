import { EventPostgresRepository } from '../event-postgres.repository';
import { MatchEvent } from '../../../domain/entities/match-event.entity';
import { MatchEventType } from '../../../domain/enums/match-event-type.enum';
import { EventTimestamp } from '../../../domain/value-objects/event-timestamp.vo';

describe('EventPostgresRepository', () => {
  let repository: EventPostgresRepository;
  let prisma: { liveEvent: any };

  beforeEach(() => {
    prisma = {
      liveEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new EventPostgresRepository(prisma as any);
  });

  it('should save event', async () => {
    const event = MatchEvent.create(
      'e1',
      'live-1',
      MatchEventType.GOAL,
      { team: 'A' },
      EventTimestamp.fromDate(new Date('2024-01-01')),
    );

    await repository.save(event);

    expect(prisma.liveEvent.create).toHaveBeenCalledWith({
      data: {
        id: 'e1',
        liveId: 'live-1',
        type: MatchEventType.GOAL,
        payload: { team: 'A' },
        createdAt: event.timestamp.getValue(),
      },
    });
  });

  it('should find by liveId', async () => {
    prisma.liveEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        liveId: 'live-1',
        type: MatchEventType.GOAL,
        payload: { team: 'A' },
        createdAt: new Date('2024-01-01'),
      },
    ]);

    const result = await repository.findByLiveId('live-1', 10);

    expect(prisma.liveEvent.findMany).toHaveBeenCalledWith({
      where: { liveId: 'live-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });

  it('should return null when event not found', async () => {
    prisma.liveEvent.findUnique.mockResolvedValue(null);

    const result = await repository.findById('e1');

    expect(result).toBeNull();
  });

  it('should find by id', async () => {
    prisma.liveEvent.findUnique.mockResolvedValue({
      id: 'e1',
      liveId: 'live-1',
      type: MatchEventType.FOUL,
      payload: { player: '10' },
      createdAt: new Date('2024-01-01'),
    });

    const result = await repository.findById('e1');

    expect(prisma.liveEvent.findUnique).toHaveBeenCalledWith({ where: { id: 'e1' } });
    expect(result?.id).toBe('e1');
  });

  it('should delete by id', async () => {
    await repository.deleteById('e1');

    expect(prisma.liveEvent.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });

  it('should count by liveId', async () => {
    prisma.liveEvent.count.mockResolvedValue(2);

    const result = await repository.countByLiveId('live-1');

    expect(prisma.liveEvent.count).toHaveBeenCalledWith({ where: { liveId: 'live-1' } });
    expect(result).toBe(2);
  });
});
