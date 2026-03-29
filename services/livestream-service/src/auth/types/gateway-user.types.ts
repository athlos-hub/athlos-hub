/**
 * Identidade do utilizador após o Kong validar o JWT (headers X-Keycloak-*).
 * Mantemos o nome JwtPayload para reduzir mudanças nos controladores.
 *
 * JWT validation is handled exclusively by Kong Gateway.
 * This service trusts X-Keycloak-Sub injected by Kong.
 * Do NOT add JWT validation here — it breaks the single-responsibility contract.
 */
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
