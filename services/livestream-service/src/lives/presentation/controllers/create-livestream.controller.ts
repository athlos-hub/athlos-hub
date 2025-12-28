import { Body, Controller, Post } from '@nestjs/common';
import { CreateLiveService } from '../../application/services/create-livestream.service.js';
import { CreateLiveDto } from '../dto/create-livestream.dto.js';

@Controller('lives')
export class CreateLiveController {
  constructor(private readonly livestreamService: CreateLiveService) {}

  @Post()
  async create(@Body() dto: CreateLiveDto) {
    return this.livestreamService.createLive(dto);
  }
}
