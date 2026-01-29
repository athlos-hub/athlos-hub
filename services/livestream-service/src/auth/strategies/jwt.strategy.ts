import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { keycloakConfig, getKeycloakPublicKey } from '../../config/keycloak.config.js';

export interface JwtPayload {
  sub: string;
  email: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email_verified: boolean;
  realm_access?: {
    roles: string[];
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          const publicKey = await getKeycloakPublicKey();
          done(null, publicKey);
        } catch (error) {
          done(error, undefined);
        }
      },
      algorithms: ['RS256'],
      issuer: keycloakConfig.issuer,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return payload;
  }
}
