import {
  Controller,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FinishLiveService } from '../../application/services/finish-live.service.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception.js';

@Controller('lives')
export class FinishLiveController {
  constructor(private readonly finishLiveService: FinishLiveService) {}

  @Patch(':id/finish')
  @HttpCode(HttpStatus.OK)
  async finish(@Param('id') id: string): Promise<LiveResponseDto> {
    try {
      const live = await this.finishLiveService.execute(id);
      return LiveResponseDto.fromDomain(live);
    } catch (error) {
      if (error instanceof InvalidLiveTransitionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
