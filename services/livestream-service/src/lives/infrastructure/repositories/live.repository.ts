import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';
import { Live } from '../../domain/entities/live.entity.js';
import { LiveMapper } from '../mappers/live.mapper.js';
import type { LiveStatus as PrismaLiveStatus } from '@prisma/client';

@Injectable()
export class LiveRepository implements ILiveRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    externalMatchId: string;
    organizationId: string;
    streamKey: string;
    status: LiveStatus;
  }): Promise<Live> {
    const prismaLive = await this.prisma.live.create({
      data: {
        externalMatchId: data.externalMatchId,
        organizationId: data.organizationId,
        streamKey: data.streamKey,
        status: LiveMapper.toPrisma(data.status),
      },
    });
    return LiveMapper.toDomain(prismaLive);
  }

  async findById(id: string): Promise<Live | null> {
    const prismaLive = await this.prisma.live.findUnique({ where: { id } });
    return prismaLive ? LiveMapper.toDomain(prismaLive) : null;
  }

  async findMany(filters?: {
    status?: LiveStatus;
    organizationId?: string;
    externalMatchId?: string;
  }): Promise<Live[]> {
    const where: {
      status?: PrismaLiveStatus;
      organizationId?: string;
      externalMatchId?: string;
    } = {};

    if (filters?.status) {
      where.status = LiveMapper.toPrisma(filters.status);
    }

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.externalMatchId) {
      where.externalMatchId = filters.externalMatchId;
    }

    const prismaLives = await this.prisma.live.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return prismaLives.map((prismaLive) => LiveMapper.toDomain(prismaLive));
  }

  async updateStatus(id: string, status: LiveStatus): Promise<Live> {
    const prismaLive = await this.prisma.live.update({
      where: { id },
      data: { status: LiveMapper.toPrisma(status) },
    });
    return LiveMapper.toDomain(prismaLive);
  }

  async save(live: Live): Promise<Live> {
    const prismaLive = await this.prisma.live.update({
      where: { id: live.id },
      data: {
        status: LiveMapper.toPrisma(live.status),
        startedAt: live.startedAt,
        endedAt: live.endedAt,
      },
    });
    return LiveMapper.toDomain(prismaLive);
  }
}
