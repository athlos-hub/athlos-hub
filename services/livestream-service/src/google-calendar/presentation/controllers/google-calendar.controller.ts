import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, UseGuards } from '@nestjs/common';
import { GoogleCalendarService } from '../../application/services/google-calendar.service.js';
import { GoogleCalendarApiService } from '../../application/services/google-calendar-api.service.js';
import {
  GenerateCalendarUrlDto,
  GenerateMultipleCalendarUrlsDto,
  CreateCalendarEventDto,
  CreateMultipleCalendarEventsDto,
} from '../dto/generate-calendar-url.dto.js';
import {
  CalendarUrlResponseDto,
  CalendarUrlSingleResponseDto,
} from '../dto/calendar-url-response.dto.js';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../auth/strategies/jwt.strategy.js';

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly calendarApiService: GoogleCalendarApiService,
  ) {}

  @Post('generate-url')
  @HttpCode(HttpStatus.OK)
  async generateCalendarUrl(
    @Body() dto: GenerateCalendarUrlDto,
  ): Promise<CalendarUrlSingleResponseDto> {
    const frontendBaseUrl =
      dto.frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const url = await this.googleCalendarService.generateCalendarUrl(
      dto.liveId,
      frontendBaseUrl,
    );

    return new CalendarUrlSingleResponseDto(url);
  }

  @Post('generate-multiple-urls')
  @HttpCode(HttpStatus.OK)
  async generateMultipleCalendarUrls(
    @Body() dto: GenerateMultipleCalendarUrlsDto,
  ): Promise<CalendarUrlResponseDto[]> {
    const frontendBaseUrl =
      dto.frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const results = await this.googleCalendarService.generateMultipleCalendarUrls(
      dto.liveIds,
      frontendBaseUrl,
    );

    return results.map((result) => new CalendarUrlResponseDto(result.liveId, result.url));
  }

  @Get('generate-url')
  @HttpCode(HttpStatus.OK)
  async generateCalendarUrlByQuery(
    @Query('liveId') liveId: string,
    @Query('frontendBaseUrl') frontendBaseUrl?: string,
  ): Promise<CalendarUrlSingleResponseDto> {
    const baseUrl = frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const url = await this.googleCalendarService.generateCalendarUrl(liveId, baseUrl);

    return new CalendarUrlSingleResponseDto(url);
  }

  @Post('create-event')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCalendarEventDto,
  ) {
    const frontendBaseUrl =
      dto.frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const result = await this.calendarApiService.createEvent(
      user.sub,
      dto.liveId,
      frontendBaseUrl,
      dto.force === true,
    );

    return {
      success: true,
      eventId: result.eventId,
      htmlLink: result.htmlLink,
      alreadyExists: result.alreadyExists,
    };
  }

  @Post('create-multiple-events')
  @HttpCode(HttpStatus.CREATED)
  async createMultipleEvents(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMultipleCalendarEventsDto,
  ) {
    const frontendBaseUrl =
      dto.frontendBaseUrl || process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const results = await this.calendarApiService.createMultipleEvents(
      user.sub,
      dto.liveIds,
      frontendBaseUrl,
      dto.force === true,
    );

    return {
      success: true,
      results,
    };
  }

  @Get('events')
  @HttpCode(HttpStatus.OK)
  async getEventsExistence(
    @CurrentUser() user: JwtPayload,
    @Query('liveIds') liveIdsQuery: string,
  ) {
    const liveIds = liveIdsQuery ? liveIdsQuery.split(',').filter(Boolean) : [];

    const results = await this.calendarApiService.checkMultipleEventsExistence(user.sub, liveIds);

    return { results };
  }
}
