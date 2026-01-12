import {
  Controller,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { FinishLiveService } from '../../application/services/finish-live.service.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception.js';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator.js';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Controller('lives')
@UseGuards(JwtAuthGuard)
export class FinishLiveController {
  constructor(
    private readonly finishLiveService: FinishLiveService,
    @Inject('ILiveRepository')
    private readonly liveRepo: ILiveRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Patch(':id/finish')
  @HttpCode(HttpStatus.OK)
  async finish(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; keycloakId: string },
  ): Promise<LiveResponseDto> {
    try {
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
          'Você não tem permissão para finalizar esta live',
        );
      }

      const updatedLive = await this.finishLiveService.execute(id);
      return LiveResponseDto.fromDomain(updatedLive);
    } catch (error) {
      if (error instanceof InvalidLiveTransitionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
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
