import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { GetLiveByIdService } from '../../application/services/get-live-by-id.service.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';

@Controller('lives')
export class GetLiveByIdController {
  constructor(private readonly getLiveByIdService: GetLiveByIdService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: string): Promise<LiveResponseDto> {
    const live = await this.getLiveByIdService.execute(id);
    return LiveResponseDto.fromDomain(live);
  }
}
