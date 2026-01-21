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
  Logger,
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
  private readonly logger = new Logger(PublishMatchEventController.name);

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
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<MatchEventResponseDto> {
    this.logger.log(`Publicando evento para live ${id}, user: ${JSON.stringify(user)}`);
    
    const live = await this.liveRepo.findById(id);
    
    if (!live) {
      throw new BadRequestException('Live não encontrada');
    }

    this.logger.log(`Live encontrada, organizationId: ${live.organizationId}`);

    const hasPermission = await this.validateUserPermission(
      user.sub,
      live.organizationId,
    );

    this.logger.log(`Permissão: ${hasPermission}`);

    if (!hasPermission) {
      throw new UnauthorizedException(
        'Você não tem permissão para publicar eventos nesta live',
      );
    }

    const event = await this.publishMatchEventService.execute(id, dto.type, dto.payload);

    return MatchEventResponseDto.fromEntity(event);
  }

  private async validateUserPermission(
    keycloakSub: string,
    organizationId: string,
  ): Promise<boolean> {
    this.logger.log(`Validando permissão: keycloakSub=${keycloakSub}, orgId=${organizationId}`);
    
    try {
      const ownerResult = await this.prisma.$queryRawUnsafe<{ keycloak_id: string }[]>(
        `SELECT u.keycloak_id 
         FROM "auth_schema"."organizations" o 
         JOIN "auth_schema"."users" u ON o.owner_id = u.id 
         WHERE o.id = $1`,
        organizationId,
      );

      this.logger.log(`Owner result: ${JSON.stringify(ownerResult)}`);

      if (ownerResult.length > 0 && ownerResult[0].keycloak_id === keycloakSub) {
        this.logger.log('Usuário é dono da organização');
        return true;
      }

      const organizerResult = await this.prisma.$queryRawUnsafe<{ keycloak_id: string }[]>(
        `SELECT u.keycloak_id 
         FROM "auth_schema"."organization_organizers" oo 
         JOIN "auth_schema"."users" u ON oo.user_id = u.id 
         WHERE oo.organization_id = $1 AND u.keycloak_id = $2`,
        organizationId,
        keycloakSub,
      );

      this.logger.log(`Organizer result: ${JSON.stringify(organizerResult)}`);

      if (organizerResult.length > 0) {
        this.logger.log('Usuário é organizador');
        return true;
      }

      this.logger.warn(`Usuário ${keycloakSub} não tem permissão na organização ${organizationId}`);
      return false;
    } catch (error) {
      this.logger.error(`Erro ao validar permissão: ${error}`);
      return false;
    }
  }
}
