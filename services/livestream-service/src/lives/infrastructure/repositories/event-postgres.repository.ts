import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { MatchEvent } from '../../domain/entities/match-event.entity.js';
import { MatchEventType } from '../../domain/enums/match-event-type.enum.js';
import { EventTimestamp } from '../../domain/value-objects/event-timestamp.vo.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class EventPostgresRepository {
  constructor(private prisma: PrismaService) {}

  async save(event: MatchEvent): Promise<void> {
    await this.prisma.liveEvent.create({
      data: {
        id: event.id,
        liveId: event.liveId,
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
        createdAt: event.timestamp.getValue(),
      },
    });
  }

  async findByLiveId(liveId: string, limit?: number): Promise<MatchEvent[]> {
    const events = await this.prisma.liveEvent.findMany({
      where: { liveId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map((event) =>
      MatchEvent.create(
        event.id,
        event.liveId,
        event.type as MatchEventType,
        event.payload as unknown as Record<string, unknown>,
        EventTimestamp.fromDate(event.createdAt),
      ),
    );
  }

  async findById(eventId: string): Promise<MatchEvent | null> {
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return null;
    }

    return MatchEvent.create(
      event.id,
      event.liveId,
      event.type as MatchEventType,
      event.payload as unknown as Record<string, unknown>,
      EventTimestamp.fromDate(event.createdAt),
    );
  }

  async deleteById(eventId: string): Promise<void> {
    await this.prisma.liveEvent.delete({
      where: { id: eventId },
    });
  }

  async countByLiveId(liveId: string): Promise<number> {
    return this.prisma.liveEvent.count({
      where: { liveId },
    });
  }
}
