import { Injectable, Logger } from '@nestjs/common';

interface OrganizationPermissionCheckResponse {
  has_permission: boolean;
  role: string | null;
  organization_id: string;
  keycloak_sub: string;
}

@Injectable()
export class AuthServiceClient {
  private readonly logger = new Logger(AuthServiceClient.name);
  private readonly authServiceUrl: string;

  constructor() {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';
  }

  async getOrganizationPermissionDetails(
    keycloakSub: string,
    organizationId: string,
  ): Promise<{ hasPermission: boolean; role: 'OWNER' | 'ORGANIZER' | 'MEMBER' | 'NONE' | null }> {
    try {
      const url = `${this.authServiceUrl}/api/organizations/by-id/${organizationId}/permissions?keycloak_sub=${encodeURIComponent(keycloakSub)}`;

      this.logger.log(`Validando permissão: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.warn(
            `Organização ou usuário não encontrado: orgId=${organizationId}, keycloakSub=${keycloakSub}`,
          );
          return { hasPermission: false, role: 'NONE' };
        }
        throw new Error(`Auth service returned ${response.status}`);
      }

      const data: OrganizationPermissionCheckResponse = await response.json();

      this.logger.log(
        `Resultado da validação: has_permission=${data.has_permission}, role=${data.role}`,
      );

      const role = (data.role as 'OWNER' | 'ORGANIZER' | 'MEMBER' | 'NONE' | null) ?? 'NONE';
      return { hasPermission: Boolean(data.has_permission), role };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Falha ao validar permissão da organização: ${message}`);
      return { hasPermission: false, role: 'NONE' };
    }
  }
}
