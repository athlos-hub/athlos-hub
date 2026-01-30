import { keycloakConfig, getKeycloakPublicKey } from '../keycloak.config';

describe('keycloakConfig', () => {
  it('should have default url', () => {
    expect(keycloakConfig.url).toBeDefined();
    expect(keycloakConfig.url).toContain('keycloak');
  });

  it('should have realm', () => {
    expect(keycloakConfig.realm).toBeDefined();
  });

  it('should have clientId', () => {
    expect(keycloakConfig.clientId).toBeDefined();
  });

  it('should have issuer', () => {
    expect(keycloakConfig.issuer).toBeDefined();
  });
});

describe('getKeycloakPublicKey', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = mockFetch;
  });

  it('should return public key when successful', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ public_key: 'test-key' }),
    });

    const result = await getKeycloakPublicKey();

    expect(result).toContain('test-key');
    expect(result).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('should throw when response not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(getKeycloakPublicKey()).rejects.toThrow('Failed to fetch Keycloak public key');
  });

  it('should throw when public_key missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(getKeycloakPublicKey()).rejects.toThrow('Public key not found');
  });

  it('should throw on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(getKeycloakPublicKey()).rejects.toThrow('Error fetching Keycloak public key');
  });
});
