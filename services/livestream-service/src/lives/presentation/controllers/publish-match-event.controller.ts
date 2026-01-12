import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PublishMatchEventService } from '../../application/services/publish-match-event.service.js';
import { PublishMatchEventDto } from '../dto/publish-match-event.dto.js';
import { MatchEventResponseDto } from '../dto/match-event-response.dto.js';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator.js';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Controller('lives')
@UseGuards(JwtAuthGuard)
export class PublishMatchEventController {
  constructor(
    private readonly publishMatchEventService: PublishMatchEventService,
    @Inject('ILiveRepository')
    private readonly liveRepo: ILiveRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':id/events')
  @HttpCode(HttpStatus.CREATED)
  async publishEvent(
    @Param('id') id: string,
    @Body() dto: PublishMatchEventDto,
    @CurrentUser() user: { userId: string; keycloakId: string },
  ): Promise<MatchEventResponseDto> {
    const live = await this.liveRepo.findById(id);
    
    if (!live) {
      throw new BadRequestException('Live não encontrada');
    }

    const hasPermission = await this.validateUserPermission(
      user.keycloakId,
      live.organizationId,
    );

    if (!hasPermission) {
      throw new UnauthorizedException(
        'Você não tem permissão para publicar eventos nesta live',
      );
    }

    const event = await this.publishMatchEventService.execute(id, dto.type, dto.payload);

    return MatchEventResponseDto.fromEntity(event);
  }

  private async validateUserPermission(
    keycloakId: string,
    organizationId: string,
  ): Promise<boolean> {
    const ownerResult = await this.prisma.$queryRawUnsafe<{ keycloak_id: string }[]>(
      `SELECT u.keycloak_id 
       FROM auth_schema.organizations o 
       JOIN auth_schema.users u ON o.owner_id = u.id 
       WHERE o.id = $1`,
      organizationId,
    );

    if (ownerResult.length > 0 && ownerResult[0].keycloak_id === keycloakId) {
      return true;
    }

    const organizerResult = await this.prisma.$queryRawUnsafe<{ keycloak_id: string }[]>(
      `SELECT u.keycloak_id 
       FROM auth_schema.organization_organizers oo 
       JOIN auth_schema.users u ON oo.user_id = u.id 
       WHERE oo.organization_id = $1 AND u.keycloak_id = $2`,
      organizationId,
      keycloakId,
    );

    return organizerResult.length > 0;
  }
}
