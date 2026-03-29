/**
 * JWT validation is handled exclusively by Kong Gateway.
 * This guard uses request.user set by JwtAuthGuard (X-Keycloak-Sub from Kong).
 * Do NOT add JWT validation here — it breaks the single-responsibility contract.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtPayload } from '../types/gateway-user.types.js';
import { AuthServiceClient } from '../services/auth-service-client.js';

@Injectable()
export class OrganizationPermissionGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationPermissionGuard.name);

  constructor(private readonly authServiceClient: AuthServiceClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const organizationId = request.body?.organizationId || request.params?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('ID da organização não fornecido');
    }

    const { hasPermission, role } =
      await this.authServiceClient.getOrganizationPermissionDetails(user.sub, organizationId);

    if (
      !hasPermission ||
      (role !== 'OWNER' && role !== 'ORGANIZER')
    ) {
      this.logger.warn(
        `User ${user.sub} denied access to organization ${organizationId} - not OWNER or ORGANIZER`,
      );

      throw new ForbiddenException(
        'Você não tem permissão para gerenciar lives desta organização. ' +
          'Apenas donos e organizadores podem transmitir.',
      );
    }

    request.organizationRole = role;

    this.logger.log(
      `User ${user.sub} authorized for organization ${organizationId} as ${role}`,
    );

    return true;
  }
}
