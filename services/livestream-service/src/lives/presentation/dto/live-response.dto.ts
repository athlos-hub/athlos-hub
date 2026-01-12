import { LiveStatus } from '../../domain/enums/live-status.enum.js';

export class LiveResponseDto {
  id: string;
  externalMatchId: string;
  organizationId: string;
  streamKey: string;
  status: LiveStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;

  constructor(
    id: string,
    externalMatchId: string,
    organizationId: string,
    streamKey: string,
    status: LiveStatus,
    startedAt: Date | null,
    endedAt: Date | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.externalMatchId = externalMatchId;
    this.organizationId = organizationId;
    this.streamKey = streamKey;
    this.status = status;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.createdAt = createdAt;
  }

  static fromDomain(live: {
    id: string;
    externalMatchId: string;
    organizationId: string;
    streamKey: string;
    status: LiveStatus;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
  }): LiveResponseDto {
    return new LiveResponseDto(
      live.id,
      live.externalMatchId,
      live.organizationId,
      live.streamKey,
      live.status,
      live.startedAt,
      live.endedAt,
      live.createdAt,
    );
  }
}
