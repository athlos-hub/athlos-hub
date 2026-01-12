import { Body, Controller, Post } from '@nestjs/common';
import { CreateLiveService } from '../../application/services/create-livestream.service.js';
import { CreateLiveDto } from '../dto/create-livestream.dto.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';

@Controller('lives')
export class CreateLiveController {
  constructor(private readonly livestreamService: CreateLiveService) {}

  @Post()
  async create(@Body() dto: CreateLiveDto): Promise<LiveResponseDto> {
    const live = await this.livestreamService.createLive(dto);
    return LiveResponseDto.fromDomain(live);
  }
}
