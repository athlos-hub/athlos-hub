import { Injectable, ConflictException } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleOAuthService } from './google-oauth.service.js';
import type { ILiveRepository } from '../../../lives/domain/repositories/livestream.interface.js';
import { Inject } from '@nestjs/common';
import { GoogleCalendarEventRepository } from '../../infrastructure/repositories/google-calendar-event.repository.js';

@Injectable()
export class GoogleCalendarApiService {
  constructor(
    private oauthService: GoogleOAuthService,
    @Inject('ILiveRepository')
    private liveRepository: ILiveRepository,
    private eventRepository: GoogleCalendarEventRepository,
  ) {}

  async checkEventExists(userId: string, liveId: string): Promise<{
    exists: boolean;
    eventId?: string;
    htmlLink?: string;
  }> {
    const existingEvent = await this.eventRepository.findByUserIdAndLiveId(userId, liveId);
    
    if (existingEvent) {
      return {
        exists: true,
        eventId: existingEvent.eventId,
        htmlLink: existingEvent.htmlLink || undefined,
      };
    }

    return { exists: false };
  }

  async createEvent(
    userId: string,
    liveId: string,
    frontendBaseUrl: string,
  ): Promise<{ eventId: string; htmlLink: string; alreadyExists: boolean }> {
    const existing = await this.checkEventExists(userId, liveId);
    if (existing.exists) {
      if (!existing.eventId || !existing.htmlLink) {
        throw new Error('Evento do Google Calendar existente está inconsistente');
      }
    
      return {
        eventId: existing.eventId,
        htmlLink: existing.htmlLink,
        alreadyExists: true,
      };
    }

    const live = await this.liveRepository.findById(liveId);

    if (!live) {
      throw new Error(`Live com ID ${liveId} não encontrada`);
    }

    const accessToken = await this.oauthService.getValidAccessToken(userId);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startDate = this.getStartDate(live);
    const endDate = this.getEndDate(live, startDate);

    const event = {
      summary: `Live: ${live.externalMatchId}`,
      description: this.buildDescription(live, frontendBaseUrl),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    const eventId = response.data.id || '';
    const htmlLink = response.data.htmlLink || '';

    await this.eventRepository.save({
      userId,
      liveId,
      eventId,
      htmlLink,
    });

    return {
      eventId,
      htmlLink,
      alreadyExists: false,
    };
  }

  async createMultipleEvents(
    userId: string,
    liveIds: string[],
    frontendBaseUrl: string,
  ): Promise<Array<{ liveId: string; eventId: string; htmlLink: string; success: boolean; alreadyExists: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      liveIds.map((liveId) =>
        this.createEvent(userId, liveId, frontendBaseUrl).then(
          (result) => ({ 
            liveId, 
            eventId: result.eventId, 
            htmlLink: result.htmlLink, 
            success: true,
            alreadyExists: result.alreadyExists,
          }),
          (error) => ({
            liveId,
            eventId: '',
            htmlLink: '',
            success: false,
            alreadyExists: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          }),
        ),
      ),
    );

    return results.map((result) =>
      result.status === 'fulfilled' ? result.value : result.reason,
    );
  }

  private getStartDate(live: NonNullable<Awaited<ReturnType<typeof this.liveRepository.findById>>>): Date {
    if (live.startedAt) {
      return live.startedAt;
    }

    const createdAt = live.createdAt;

    if (live.isScheduled() && createdAt < new Date()) {
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    return createdAt;
  }

  private getEndDate(
    live: NonNullable<Awaited<ReturnType<typeof this.liveRepository.findById>>>,
    startDate: Date,
  ): Date {
    const durationHours = 2;
    return new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  }

  private buildDescription(
    live: NonNullable<Awaited<ReturnType<typeof this.liveRepository.findById>>>,
    frontendBaseUrl: string,
  ): string {
    const lines: string[] = [];

    lines.push(`Partida: ${live.externalMatchId}`);
    lines.push(`Status: ${live.status}`);
    lines.push(`Organização: ${live.organizationId}`);
    lines.push('');
    lines.push(`Acesse a live em: ${frontendBaseUrl}/jogos/${live.id}`);

    return lines.join('\n');
  }
}
