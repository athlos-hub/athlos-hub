import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ListLivesService } from '../../application/services/list-lives.service.js';
import { ListLivesDto } from '../dto/list-lives.dto.js';
import { LiveResponseDto } from '../dto/live-response.dto.js';

@Controller('lives')
export class ListLivesController {
  constructor(private readonly listLivesService: ListLivesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Query() query: ListLivesDto): Promise<LiveResponseDto[]> {
    const lives = await this.listLivesService.execute({
      status: query.status,
      organizationId: query.organizationId,
      externalMatchId: query.externalMatchId,
    });

    return lives.map((live) => LiveResponseDto.fromDomain(live));
  }
}
