import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export interface GoogleCalendarTokenData {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string;
}

@Injectable()
export class GoogleCalendarTokenRepository {
  constructor(private prisma: PrismaService) {}

  async save(data: GoogleCalendarTokenData) {
    return this.prisma.googleCalendarToken.upsert({
      where: { userId: data.userId },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.googleCalendarToken.findUnique({
      where: { userId },
    });
  }

  async deleteByUserId(userId: string) {
    return this.prisma.googleCalendarToken.delete({
      where: { userId },
    });
  }
}
