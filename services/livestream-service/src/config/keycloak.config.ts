export const keycloakConfig = {
  url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'athloshub',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'athloshub-client',
};

export async function getKeycloakPublicKey(): Promise<string> {
  const url = `${keycloakConfig.url}/realms/${keycloakConfig.realm}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Keycloak public key: ${response.statusText}`);
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
