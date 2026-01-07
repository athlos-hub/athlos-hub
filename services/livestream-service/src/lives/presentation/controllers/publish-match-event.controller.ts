import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PublishMatchEventService } from '../../application/services/publish-match-event.service.js';
import { PublishMatchEventDto } from '../dto/publish-match-event.dto.js';

@Controller('lives')
export class PublishMatchEventController {
  constructor(private readonly publishMatchEventService: PublishMatchEventService) {}

  @Post(':id/events')
  @HttpCode(HttpStatus.OK)
  async publishEvent(@Param('id') id: string, @Body() dto: PublishMatchEventDto): Promise<void> {
    try {
      await this.publishMatchEventService.execute(id, dto.eventType, dto.eventData);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }
}
