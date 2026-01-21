import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

interface OrganizationPermissionResponse {
  hasPermission: boolean;
  role?: 'OWNER' | 'ORGANIZER' | 'MEMBER' | 'NONE';
  organizationId?: string;
}

@Injectable()
export class AuthServiceClient {
  private readonly logger = new Logger(AuthServiceClient.name);
  private readonly authServiceUrl: string;

  constructor() {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';
  }

  async validateOrganizationPermission(
    userId: string,
    organizationId: string,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.authServiceUrl}/organizations/${organizationId}/check-permission`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          return false;
        }
        throw new Error(`Auth service returned ${response.status}`);
      }

      const data: OrganizationPermissionResponse = await response.json();

      return data.hasPermission && (data.role === 'OWNER' || data.role === 'ORGANIZER');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to validate organization permission: ${message}`);
      throw new ForbiddenException(
        'Não foi possível validar suas permissões. Tente novamente.',
      );
    }
  }

  async getUserRoleInOrganization(
    userId: string,
    organizationId: string,
    accessToken: string,
  ): Promise<'OWNER' | 'ORGANIZER' | 'MEMBER' | 'NONE'> {
    try {
      const response = await fetch(
        `${this.authServiceUrl}/organizations/${organizationId}/my-role`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        return 'NONE';
      }

      const data = await response.json();
      return data.role || 'NONE';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get user role: ${message}`);
      return 'NONE';
    }
  }
}
