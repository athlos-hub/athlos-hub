import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export interface GoogleCalendarEventData {
  userId: string;
  liveId: string;
  eventId: string;
  htmlLink?: string;
}

@Injectable()
export class GoogleCalendarEventRepository {
  constructor(private prisma: PrismaService) {}

  async save(data: GoogleCalendarEventData) {
    return this.prisma.googleCalendarEvent.upsert({
      where: {
        userId_liveId: {
          userId: data.userId,
          liveId: data.liveId,
        },
      },
      update: {
        eventId: data.eventId,
        htmlLink: data.htmlLink,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        liveId: data.liveId,
        eventId: data.eventId,
        htmlLink: data.htmlLink,
      },
    });
  }

  async findByUserIdAndLiveId(userId: string, liveId: string) {
    return this.prisma.googleCalendarEvent.findUnique({
      where: {
        userId_liveId: {
          userId,
          liveId,
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.googleCalendarEvent.findMany({
      where: { userId },
    });
  }

  async deleteByUserIdAndLiveId(userId: string, liveId: string) {
    return this.prisma.googleCalendarEvent.delete({
      where: {
        userId_liveId: {
          userId,
          liveId,
        },
      },
    });
  }
}
