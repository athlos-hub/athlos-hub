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
import { CancelLiveService } from '../../application/services/cancel-live.service.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception.js';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator.js';
import type { ILiveRepository } from '../../domain/repositories/livestream.interface.js';
import { AuthServiceClient } from '../../../auth/services/auth-service-client.js';

@Controller('lives')
@UseGuards(JwtAuthGuard)
export class CancelLiveController {
  constructor(
    private readonly cancelLiveService: CancelLiveService,
    @Inject('ILiveRepository')
    private readonly liveRepo: ILiveRepository,
    private readonly authServiceClient: AuthServiceClient,
  ) {}

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<LiveResponseDto> {
    try {
      const live = await this.liveRepo.findById(id);
      
      if (!live) {
        throw new BadRequestException('Live não encontrada');
      }

      const hasPermission = await this.validateUserPermission(
        user.sub,
        live.organizationId,
      );

      if (!hasPermission) {
        throw new UnauthorizedException(
          'Você não tem permissão para cancelar esta live',
        );
      }

      const updatedLive = await this.cancelLiveService.execute(id);
      return LiveResponseDto.fromDomain(updatedLive);
    } catch (error) {
      if (error instanceof InvalidLiveTransitionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async validateUserPermission(
    keycloakSub: string,
    organizationId: string,
  ): Promise<boolean> {
    return await this.authServiceClient.checkOrganizationPermission(
      keycloakSub,
      organizationId,
    );
  }
}
