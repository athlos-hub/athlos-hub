import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { JwtPayload } from '../types/gateway-user.types.js';

/**
 * JWT validation is handled exclusively by Kong Gateway.
 * This service trusts X-Keycloak-Sub injected by Kong.
 * Do NOT add JWT validation here — it breaks the single-responsibility contract.
 */
function headerString(req: Request, name: string): string {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] ?? '';
  return typeof v === 'string' ? v : '';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const trustGateway = this.config.get<boolean>('TRUST_GATEWAY', true);
    const env = this.config.get<'dev' | 'prod'>('ENV', 'dev');

    const req = context.switchToHttp().getRequest<Request>();
    let sub = headerString(req, 'x-keycloak-sub');
    if (
      !sub &&
      trustGateway === false &&
      env !== 'prod'
    ) {
      sub = headerString(req, 'x-test-sub');
    }
    if (!sub) {
      throw new UnauthorizedException('Não autenticado (X-Keycloak-Sub ausente).');
    }
    const email = headerString(req, 'x-keycloak-email');
    const preferredUsername = headerString(req, 'x-keycloak-preferred-username');
    const rolesHeader = headerString(req, 'x-keycloak-roles');
    const roles = rolesHeader
      ? rolesHeader.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

    const user: JwtPayload = {
      sub,
      email: email || '',
      preferred_username: preferredUsername || sub,
      email_verified: false,
      realm_access: roles.length ? { roles } : undefined,
    };
    (req as Request & { user: JwtPayload }).user = user;
    return true;
  }
}
