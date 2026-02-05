import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../../config/env.service.js';

@Injectable()
export class CompetitionsClientService {
  private readonly logger = new Logger(CompetitionsClientService.name);
  private readonly competitionsServiceUrl: string;

  constructor(private readonly envService: EnvService) {
    this.competitionsServiceUrl = this.envService.get('COMPETITIONS_SERVICE_URL');
  }

  /**
   * Chama o competitions-service para iniciar uma partida (mudar status para LIVE)
   */
  async startMatch(matchId: string): Promise<void> {
    try {
      const url = `${this.competitionsServiceUrl}/api/v1/matches/${matchId}/start`;
      
      this.logger.log(`Iniciando partida ${matchId} no competitions-service: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        this.logger.error(
          `Falha ao iniciar partida ${matchId}. Status: ${response.status}, Error: ${errorText}`,
        );
        throw new Error(`Failed to start match: ${response.status}`);
      }

      const data = await response.json();
      this.logger.log(`Partida ${matchId} iniciada com sucesso: status=${data.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erro ao iniciar partida ${matchId}: ${message}`);
      // Não propaga o erro para não bloquear a live
      // A live pode continuar mesmo se falhar ao notificar o competitions-service
    }
  }
}
