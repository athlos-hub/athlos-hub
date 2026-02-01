import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { ILiveRepository } from '../../../lives/domain/repositories/livestream.interface.js';

@Injectable()
export class GoogleCalendarService {
  constructor(
    @Inject('ILiveRepository')
    private liveRepository: ILiveRepository,
  ) {}

  async generateCalendarUrl(liveId: string, frontendBaseUrl: string, match?: any): Promise<string> {
    const live = await this.liveRepository.findById(liveId);

    if (!live) {
      throw new NotFoundException(`Live com ID ${liveId} não encontrada`);
    }

    return this.buildCalendarUrl(live, frontendBaseUrl, match);
  }

  async generateMultipleCalendarUrls(
    liveIds: string[],
    frontendBaseUrl: string,
    matchMap?: Record<string, any>,
  ): Promise<Array<{ liveId: string; url: string }>> {
    const lives = await Promise.all(
      liveIds.map((id) => this.liveRepository.findById(id)),
    );

    const validLives = lives.filter((live) => live !== null);

    if (validLives.length === 0) {
      throw new NotFoundException('Nenhuma live válida encontrada');
    }

    return validLives.map((live) => ({
      liveId: live!.id,
      url: this.buildCalendarUrl(live!, frontendBaseUrl, matchMap?.[live!.id]),
    }));
  }

  private buildCalendarUrl(live: NonNullable<Awaited<ReturnType<typeof this.liveRepository.findById>>>, frontendBaseUrl: string, match?: any): string {
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams();

    const eventTitle = match && (match.competitionName || (match.homeTeam?.name && match.awayTeam?.name))
      ? (match.competitionName
          ? `Live: ${match.competitionName} - ${match.homeTeam?.name || ''} x ${match.awayTeam?.name || ''}`.trim()
          : `Live: ${match.homeTeam?.name || ''} x ${match.awayTeam?.name || ''}`.trim())
      : `Live: ${live.externalMatchId}`;
    params.append('action', 'TEMPLATE');
    params.append('text', encodeURIComponent(eventTitle));

    const startDate = this.getStartDate(live);
    const endDate = this.getEndDate(live, startDate);

    const startDateStr = this.formatDateForGoogleCalendar(startDate);
    const endDateStr = this.formatDateForGoogleCalendar(endDate);
    params.append('dates', `${startDateStr}/${endDateStr}`);

    const description = match
      ? this.buildDescriptionFromMatch(match, live, frontendBaseUrl)
      : this.buildDescription(live, frontendBaseUrl);
    params.append('details', encodeURIComponent(description));

    return `${baseUrl}?${params.toString()}`;
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

  private formatDateForGoogleCalendar(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
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

  private buildDescriptionFromMatch(match: any, live: any, frontendBaseUrl: string) {
    const lines: string[] = [];

    if (match.competitionName) lines.push(`Competição: ${match.competitionName}`);
    if (match.roundName) lines.push(`Rodada: ${match.roundName}`);
    if (match.groupName) lines.push(`Grupo: ${match.groupName}`);

    if (match.homeTeam || match.awayTeam) {
      const home = match.homeTeam?.name || 'Casa';
      const away = match.awayTeam?.name || 'Visitante';
      lines.push(`Confronto: ${home} x ${away}`);
      if (typeof match.homeScore === 'number' || typeof match.awayScore === 'number') {
        lines.push(`Placar: ${match.homeScore ?? '-'} x ${match.awayScore ?? '-'} `);
      }
    }

    if (match.local) lines.push(`Local: ${match.local}`);

    if (match.scheduledDatetime) lines.push(`Horário: ${new Date(match.scheduledDatetime).toLocaleString('pt-BR')}`);

    lines.push('');
    lines.push(`Acesse a live em: ${frontendBaseUrl}/jogos/${live.id}`);

    return lines.join('\n');
  }
}
