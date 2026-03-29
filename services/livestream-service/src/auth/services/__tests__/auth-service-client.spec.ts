import { AuthServiceClient } from '../auth-service-client';

describe('AuthServiceClient', () => {
  let client: AuthServiceClient;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;
    client = new AuthServiceClient();
  });

  it('should return permission details when ok', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        has_permission: true,
        role: 'OWNER',
        organization_id: 'org-uuid',
        keycloak_sub: 'u1',
      }),
    });

    const result = await client.getOrganizationPermissionDetails('u1', 'org-uuid');

    expect(result).toEqual({ hasPermission: true, role: 'OWNER' });
  });

  it('should return false for 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await client.getOrganizationPermissionDetails('u1', 'org-uuid');

    expect(result).toEqual({ hasPermission: false, role: 'NONE' });
  });

  it('should return false on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await client.getOrganizationPermissionDetails('u1', 'org-uuid');

    expect(result).toEqual({ hasPermission: false, role: 'NONE' });
  });
});
