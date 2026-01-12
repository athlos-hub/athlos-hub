import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { IStreamKeyRepository } from '../../lives/domain/repositories/stream-key.interface.js';
import type { ILiveRepository } from '../../lives/domain/repositories/livestream.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ValidateStreamKeyService {
  private readonly logger = new Logger(ValidateStreamKeyService.name);

  constructor(
    @Inject('IStreamKeyRepository')
    private streamKeyRepo: IStreamKeyRepository,
    @Inject('ILiveRepository')
    private liveRepo: ILiveRepository,
    private prisma: PrismaService,
  ) {}

  async execute(streamKey: string, jwtToken?: string): Promise<string> {
    const metadata = await this.streamKeyRepo.getMetadata(streamKey);

    if (!metadata) {
      this.logger.warn(`Chave de transmissão inválida: ${streamKey}`);
      throw new UnauthorizedException('Chave de transmissão inválida');
    }

    const live = await this.liveRepo.findById(metadata.liveId);

    if (!live) {
      this.logger.warn(`Live não encontrada para stream key: ${streamKey}`);
      throw new UnauthorizedException('Live não encontrada');
    }

    if (!live.isScheduled() && !live.isLive()) {
      this.logger.warn(`Live ${live.id} não está em estado válido: ${live.status}`);
      throw new ConflictException('Live não está em um estado válido para aceitar transmissões');
    }

    if (!jwtToken) {
      this.logger.error('Token JWT não fornecido - autenticação obrigatória');
      throw new UnauthorizedException(
        'Token de autenticação é obrigatório. Por favor, forneça um token JWT válido para iniciar a transmissão.',
      );
    }

    const userId = this.extractUserIdFromToken(jwtToken);

    if (!userId) {
      this.logger.error('Falha ao extrair userId do token JWT');
      throw new UnauthorizedException(
        'Token de autenticação inválido. Não foi possível extrair as informações do usuário.',
      );
    }

    const hasPermission = await this.validateUserPermission(userId, metadata.organizationId);

    if (!hasPermission) {
      this.logger.error(
        `Usuário ${userId} não tem permissão para transmitir pela organização ${metadata.organizationId}`,
      );
      throw new UnauthorizedException(
        'Você não tem permissão para transmitir para esta organização. Apenas donos e organizadores podem iniciar transmissões.',
      );
    }

    this.logger.log(
      `Transmissão autorizada: liveId=${live.id}, userId=${userId}, organizationId=${metadata.organizationId}`,
    );

    await this.streamKeyRepo.markAsActive(streamKey);

    if (live.isScheduled()) {
      live.start();
      await this.liveRepo.save(live);
      this.logger.log(`Live ${live.id} iniciada automaticamente`);
    }

    return live.id;
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const cleanToken = token.replace('Bearer ', '').trim();

      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payloadString = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadString) as { sub?: string };
      return payload.sub ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn(`Falha ao extrair userId do token: ${message}`);
      return null;
    }
  }

  private async validateUserPermission(userId: string, organizationId: string): Promise<boolean> {
    try {
      this.logger.log(
        `🔍 Validando permissão para keycloakId=${userId}, organizationId=${organizationId}`,
      );

      const organization = await this.prisma.$queryRawUnsafe<{ owner_keycloak_id: string }[]>(
        `SELECT u.keycloak_id as owner_keycloak_id 
         FROM "auth_schema"."organizations" o
         JOIN "auth_schema"."users" u ON o.owner_id = u.id
         WHERE o.id = $1`,
        organizationId,
      );

      this.logger.log(`📊 Resultado da consulta de organizações: ${JSON.stringify(organization)}`);

      if (organization.length > 0) {
        const ownerKeycloakId = organization[0].owner_keycloak_id;
        this.logger.log(
          `🔑 Comparando: keycloakId="${userId}" vs ownerKeycloakId="${ownerKeycloakId}"`,
        );

        if (ownerKeycloakId === userId) {
          this.logger.log(`✅ Usuário ${userId} é DONO da organização ${organizationId}`);
          return true;
        }
      } else {
        this.logger.warn(`⚠️ Organização ${organizationId} não encontrada no banco de dados`);
      }

      this.logger.log(`🔍 Verificando se usuário é ORGANIZADOR...`);
      const organizer = await this.prisma.$queryRawUnsafe<{ user_keycloak_id: string }[]>(
        `SELECT u.keycloak_id as user_keycloak_id
         FROM "auth_schema"."organization_organizers" oo
         JOIN "auth_schema"."users" u ON oo.user_id = u.id
         WHERE oo.organization_id = $1 AND u.keycloak_id = $2`,
        organizationId,
        userId,
      );

      this.logger.log(`📊 Resultado da consulta de organizadores: ${JSON.stringify(organizer)}`);

      if (organizer.length > 0) {
        this.logger.log(`✅ Usuário ${userId} é ORGANIZADOR da organização ${organizationId}`);
        return true;
      }

      this.logger.warn(
        `❌ Usuário ${userId} NÃO é dono ou organizador da organização ${organizationId}`,
      );
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Falha ao validar permissão do usuário: ${message}`);
      return false;
    }
  }
}
