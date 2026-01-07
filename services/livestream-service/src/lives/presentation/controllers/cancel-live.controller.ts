import {
  Controller,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CancelLiveService } from '../../application/services/cancel-live.service.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception.js';

@Controller('lives')
export class CancelLiveController {
  constructor(private readonly cancelLiveService: CancelLiveService) {}

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string): Promise<LiveResponseDto> {
    try {
      const live = await this.cancelLiveService.execute(id);
      return LiveResponseDto.fromDomain(live);
    } catch (error) {
      if (error instanceof InvalidLiveTransitionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
