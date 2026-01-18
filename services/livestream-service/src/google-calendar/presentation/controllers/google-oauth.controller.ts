import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { GoogleOAuthService } from '../../application/services/google-oauth.service.js';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../auth/strategies/jwt.strategy.js';

@Controller('google-calendar/oauth')
export class GoogleOAuthController {
  constructor(private readonly oauthService: GoogleOAuthService) {}

  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('redirect') redirect?: string,
  ) {
    const userId = user.sub;
    const state = redirect ? `${userId}|${redirect}` : userId;

    const authUrl = this.oauthService.getAuthorizationUrl(userId, state);

    res.redirect(authUrl);
  }

  @Get('authorize-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAuthorizeUrl(
    @CurrentUser() user: JwtPayload,
    @Query('redirect') redirect?: string,
  ) {
    const userId = user.sub;
    const state = redirect ? `${userId}|${redirect}` : userId;

    const authUrl = this.oauthService.getAuthorizationUrl(userId, state);

    return { url: authUrl };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(`/?error=oauth_cancelled&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`/?error=oauth_failed&message=${encodeURIComponent('Código de autorização não fornecido')}`);
    }

    try {
      const [userId, redirect] = state.split('|');
      
      if (!userId) {
        throw new BadRequestException('State inválido');
      }

      const tokens = await this.oauthService.exchangeCodeForTokens(code);
      await this.oauthService.saveTokens(
        userId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
        tokens.scope,
      );

      const redirectUrl = redirect || '/jogos?google_calendar_connected=true';
      res.redirect(redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      res.redirect(`/?error=oauth_failed&message=${encodeURIComponent(message)}`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getStatus(@CurrentUser() user: JwtPayload) {
    const userId = user.sub;
    const isAuthorized = await this.oauthService.isAuthorized(userId);

    return { authorized: isAuthorized };
  }

  @Get('revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revoke(@CurrentUser() user: JwtPayload) {
    const userId = user.sub;
    await this.oauthService.revokeAuthorization(userId);

    return { message: 'Autorização revogada com sucesso' };
  }
}
