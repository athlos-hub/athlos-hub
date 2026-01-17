import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../../config/env.schema.js';
import { GoogleCalendarTokenRepository } from '../../infrastructure/repositories/google-calendar-token.repository.js';

@Injectable()
export class GoogleOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private configService: ConfigService<Env>,
    private tokenRepository: GoogleCalendarTokenRepository,
  ) {
    this.clientId = this.configService.get('GOOGLE_CLIENT_ID', { infer: true }) || '';
    this.clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET', { infer: true }) || '';
    this.redirectUri =
      this.configService.get('GOOGLE_REDIRECT_URI', { infer: true }) ||
      'http://localhost:3333/google-calendar/oauth/callback';
  }

  getAuthorizationUrl(userId: string, state?: string): string {
    if (!this.clientId) {
      throw new BadRequestException('Google OAuth não configurado. Verifique GOOGLE_CLIENT_ID.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: state || userId,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scope?: string;
  }> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException(
        'Google OAuth não configurado. Verifique GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Falha ao obter tokens: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException(
        'Google OAuth não configurado. Verifique GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Falha ao atualizar token: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number,
    scope?: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.tokenRepository.save({
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
    });
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const tokenData = await this.tokenRepository.findByUserId(userId);

    if (!tokenData) {
      throw new BadRequestException('Usuário não autorizado. Conecte sua conta do Google Calendar.');
    }

    if (tokenData.expiresAt < new Date() && tokenData.refreshToken) {
      const refreshed = await this.refreshAccessToken(tokenData.refreshToken);
      await this.saveTokens(userId, refreshed.accessToken, tokenData.refreshToken, refreshed.expiresIn, tokenData.scope || undefined);
      return refreshed.accessToken;
    }

    return tokenData.accessToken;
  }

  async isAuthorized(userId: string): Promise<boolean> {
    const tokenData = await this.tokenRepository.findByUserId(userId);
    return !!tokenData;
  }

  async revokeAuthorization(userId: string): Promise<void> {
    await this.tokenRepository.deleteByUserId(userId);
  }
}
