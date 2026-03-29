/**
 * JWT validation is handled exclusively by Kong Gateway.
 * This service trusts X-Keycloak-Sub injected by Kong.
 * Do NOT add Passport JWT strategies or JWT validation here — it breaks the single-responsibility contract.
 */
import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthServiceClient } from './services/auth-service-client.js';
import { OrganizationPermissionGuard } from './guards/organization-permission.guard.js';

@Module({
  providers: [JwtAuthGuard, AuthServiceClient, OrganizationPermissionGuard],
  exports: [JwtAuthGuard, AuthServiceClient, OrganizationPermissionGuard],
})
export class AuthModule {}
