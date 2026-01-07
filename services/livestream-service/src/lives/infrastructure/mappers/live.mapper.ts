import { Live as PrismaLive, LiveStatus as PrismaLiveStatus } from '@prisma/client';
import { Live } from '../../domain/entities/live.entity.js';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';

export class LiveMapper {
  private static readonly statusToDomain: Record<PrismaLiveStatus, LiveStatus> = {
    scheduled: LiveStatus.SCHEDULED,
    live: LiveStatus.LIVE,
    finished: LiveStatus.FINISHED,
    cancelled: LiveStatus.CANCELLED,
  };

  private static readonly statusToPrisma: Record<LiveStatus, PrismaLiveStatus> = {
    [LiveStatus.SCHEDULED]: 'scheduled',
    [LiveStatus.LIVE]: 'live',
    [LiveStatus.FINISHED]: 'finished',
    [LiveStatus.CANCELLED]: 'cancelled',
  };

  static toDomain(prismaLive: PrismaLive): Live {
    return new Live(
      prismaLive.id,
      prismaLive.externalMatchId,
      prismaLive.organizationId,
      prismaLive.streamKey,
      this.statusToDomain[prismaLive.status],
      prismaLive.startedAt,
      prismaLive.endedAt,
      prismaLive.createdAt,
    );
  }

  static toPrisma(status: LiveStatus): PrismaLiveStatus {
    return this.statusToPrisma[status];
  }
}
