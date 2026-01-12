import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthServiceClient } from './services/auth-service-client.js';
import { OrganizationPermissionGuard } from './guards/organization-permission.guard.js';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, AuthServiceClient, OrganizationPermissionGuard],
  exports: [JwtStrategy, AuthServiceClient, OrganizationPermissionGuard],
})
export class AuthModule {}
