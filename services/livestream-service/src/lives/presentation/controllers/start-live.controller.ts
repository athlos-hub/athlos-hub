import {
  Controller,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { StartLiveService } from '../../application/services/start-live.service.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';
import { InvalidLiveTransitionException } from '../../domain/exceptions/invalid-live-transition.exception.js';
import { LiveAlreadyFinishedException } from '../../domain/exceptions/live-already-finished.exception.js';

@Controller('lives')
export class StartLiveController {
  constructor(private readonly startLiveService: StartLiveService) {}

  @Patch(':id/start')
  @HttpCode(HttpStatus.OK)
  async start(@Param('id') id: string): Promise<LiveResponseDto> {
    try {
      const live = await this.startLiveService.execute(id);
      return LiveResponseDto.fromDomain(live);
    } catch (error) {
      if (
        error instanceof InvalidLiveTransitionException ||
        error instanceof LiveAlreadyFinishedException
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
