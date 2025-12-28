import { LiveStatus } from '../enums/live-status.enum.js';

export class Live {
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
    startedAt: Date | null = null,
    endedAt: Date | null = null,
    createdAt: Date = new Date(),
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
}
