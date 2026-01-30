import { LiveMapper } from '../live.mapper';
import { LiveStatus } from '../../../domain/enums/live-status.enum';

const basePrismaLive = {
  id: 'live-1',
  externalMatchId: 'match-1',
  organizationId: 'org-1',
  streamKey: 'key-1',
  startedAt: null,
  endedAt: null,
  createdAt: new Date('2024-01-01'),
};

describe('LiveMapper', () => {
  it('should map prisma live to domain for scheduled', () => {
    const live = LiveMapper.toDomain({
      ...basePrismaLive,
      status: 'scheduled',
    } as any);

    expect(live.id).toBe('live-1');
    expect(live.status).toBe(LiveStatus.SCHEDULED);
  });

  it('should map prisma live to domain for live', () => {
    const live = LiveMapper.toDomain({
      ...basePrismaLive,
      status: 'live',
    } as any);

    expect(live.status).toBe(LiveStatus.LIVE);
  });

  it('should map domain status to prisma status', () => {
    expect(LiveMapper.toPrisma(LiveStatus.SCHEDULED)).toBe('scheduled');
    expect(LiveMapper.toPrisma(LiveStatus.LIVE)).toBe('live');
    expect(LiveMapper.toPrisma(LiveStatus.FINISHED)).toBe('finished');
    expect(LiveMapper.toPrisma(LiveStatus.CANCELLED)).toBe('cancelled');
  });
});
