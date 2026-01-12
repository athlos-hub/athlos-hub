import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetMatchEventsHistoryService } from '../../application/services/get-match-events-history.service.js';
import { MatchEventResponseDto } from '../dto/match-event-response.dto.js';

@Controller('lives')
export class GetMatchEventsHistoryController {
  constructor(private readonly getMatchEventsHistoryService: GetMatchEventsHistoryService) {}

  @Get(':id/events')
  async getEventsHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<MatchEventResponseDto[]> {
    const limitNumber = limit ? parseInt(limit, 10) : undefined;
    const events = await this.getMatchEventsHistoryService.execute(id, limitNumber);

    return events.map((event) => MatchEventResponseDto.fromEntity(event));
  }
}
