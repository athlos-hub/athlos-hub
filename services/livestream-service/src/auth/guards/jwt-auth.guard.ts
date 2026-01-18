import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    this.logger.debug(`[JwtAuthGuard] Request to ${request.method} ${request.url}`);
    this.logger.debug(`[JwtAuthGuard] Has auth header: ${!!authHeader}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`[JwtAuthGuard] Authentication failed: ${err?.message || info?.message || 'No user'}`);
      throw err || new UnauthorizedException('Token inválido ou ausente');
    }
    return user;
  }
}
