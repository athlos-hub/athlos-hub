import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { LiveStatus } from '../../domain/enums/live-status.enum.js';
import { Live } from '../../domain/entities/live.entity.js';
import { LiveMapper } from '../mappers/live.mapper.js';

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

  async updateStatus(id: string, status: LiveStatus): Promise<Live> {
    const prismaLive = await this.prisma.live.update({
      where: { id },
      data: { status: LiveMapper.toPrisma(status) },
    });
    return LiveMapper.toDomain(prismaLive);
  }
}
