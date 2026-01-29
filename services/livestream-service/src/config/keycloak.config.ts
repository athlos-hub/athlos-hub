export const keycloakConfig = {
  // Ajuste o fallback para a porta do KONG (8100) e o prefixo /keycloak
  url: process.env.KEYCLOAK_URL || 'http://localhost:8100/keycloak/',
  realm: process.env.KEYCLOAK_REALM || 'athlos',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'auth-client',
  issuer: `${process.env.KEYCLOAK_ISSUER || 'http://localhost:8100/keycloak'}/realms/${process.env.KEYCLOAK_REALM || 'athlos'}`,
};

export async function getKeycloakPublicKey(): Promise<string> {
  const url = `${keycloakConfig.url}/realms/${keycloakConfig.realm}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Keycloak public key: ${response.status} ${response.statusText}. ` +
        `URL: ${url}. ` +
        `Verifique se o Keycloak está rodando e se a URL/realm estão corretos.`
      );
    }

    const data = await response.json();

    if (!data.public_key) {
      throw new Error('Public key not found in Keycloak realm response');
    }

    return `-----BEGIN PUBLIC KEY-----\n${data.public_key}\n-----END PUBLIC KEY-----`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching Keycloak public key: ${message}`);
  }
}
