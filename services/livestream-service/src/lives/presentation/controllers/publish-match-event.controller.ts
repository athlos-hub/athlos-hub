import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PublishMatchEventService } from '../../application/services/publish-match-event.service.js';
import { PublishMatchEventDto } from '../dto/publish-match-event.dto.js';
import { MatchEventResponseDto } from '../dto/match-event-response.dto.js';

@Controller('lives')
export class PublishMatchEventController {
  constructor(private readonly publishMatchEventService: PublishMatchEventService) {}

  @Post(':id/events')
  @HttpCode(HttpStatus.CREATED)
  async publishEvent(
    @Param('id') id: string,
    @Body() dto: PublishMatchEventDto,
  ): Promise<MatchEventResponseDto> {
    const event = await this.publishMatchEventService.execute(id, dto.type, dto.payload);

    return MatchEventResponseDto.fromEntity(event);
  }
}
