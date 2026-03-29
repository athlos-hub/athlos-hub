/** Referência ao realm Keycloak (emissão de tokens); validação no Kong. */
export const keycloakConfig = {
  url: process.env.KEYCLOAK_URL || 'http://localhost:8100/keycloak/',
  realm: process.env.KEYCLOAK_REALM || 'athlos',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'auth-client',
  issuer: `${process.env.KEYCLOAK_ISSUER || 'http://localhost:8100/keycloak'}/realms/${process.env.KEYCLOAK_REALM || 'athlos'}`,
};
