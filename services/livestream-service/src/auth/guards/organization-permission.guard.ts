import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy.js';
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

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new ForbiddenException('Token de autorização não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');

    const hasPermission = await this.authServiceClient.validateOrganizationPermission(
      user.sub,
      organizationId,
      token,
    );

    if (!hasPermission) {
      this.logger.warn(
        `User ${user.sub} denied access to organization ${organizationId} - not OWNER or ORGANIZER`,
      );

      throw new ForbiddenException(
        'Você não tem permissão para gerenciar lives desta organização. ' +
          'Apenas donos e organizadores podem transmitir.',
      );
    }

    const role = await this.authServiceClient.getUserRoleInOrganization(
      user.sub,
      organizationId,
      token,
    );

    request.organizationRole = role;

    this.logger.log(
      `User ${user.sub} authorized for organization ${organizationId} as ${role}`,
    );

    return true;
  }
}
