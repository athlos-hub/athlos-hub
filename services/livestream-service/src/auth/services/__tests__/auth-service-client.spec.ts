import { ForbiddenException } from '@nestjs/common';
import { AuthServiceClient } from '../auth-service-client';

describe('AuthServiceClient', () => {
  let client: AuthServiceClient;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = mockFetch;
    client = new AuthServiceClient();
  });

  it('should return true for valid permission', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hasPermission: true, role: 'OWNER' }),
    });

    const result = await client.validateOrganizationPermission('u1', 'org1', 'token');

    expect(result).toBe(true);
  });

  it('should return false for 403 status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    const result = await client.validateOrganizationPermission('u1', 'org1', 'token');

    expect(result).toBe(false);
  });

  it('should return false for 404 status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await client.validateOrganizationPermission('u1', 'org1', 'token');

    expect(result).toBe(false);
  });

  it('should throw on other error status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(client.validateOrganizationPermission('u1', 'org1', 'token')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(client.validateOrganizationPermission('u1', 'org1', 'token')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should get role in organization', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'OWNER' }),
    });

    const result = await client.getUserRoleInOrganization('u1', 'org1', 'token');

    expect(result).toBe('OWNER');
  });

  it('should return NONE for non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    const result = await client.getUserRoleInOrganization('u1', 'org1', 'token');

    expect(result).toBe('NONE');
  });
});
