import { ForbiddenException } from '@nestjs/common';
import { OrganizationPermissionGuard } from '../organization-permission.guard';
import { AuthServiceClient } from '../../services/auth-service-client';

describe('OrganizationPermissionGuard', () => {
  let guard: OrganizationPermissionGuard;
  let authServiceClient: jest.Mocked<AuthServiceClient>;

  beforeEach(() => {
    authServiceClient = {
      validateOrganizationPermission: jest.fn(),
      getUserRoleInOrganization: jest.fn(),
    } as any;

    guard = new OrganizationPermissionGuard(authServiceClient);
  });

  const createContext = (user: any, body?: any, params?: any, authHeader?: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        body,
        params,
        headers: { authorization: authHeader },
      }),
    }),
  } as any);

  it('should throw when user not authenticated', async () => {
    const context = createContext(null, {}, {}, 'Bearer token');

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw when organizationId missing', async () => {
    const context = createContext({ sub: 'u1' }, {}, {}, 'Bearer token');

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw when auth header missing', async () => {
    const context = createContext({ sub: 'u1' }, { organizationId: 'org1' }, {});

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw when permission denied', async () => {
    authServiceClient.validateOrganizationPermission.mockResolvedValue(false);
    const context = createContext({ sub: 'u1' }, { organizationId: 'org1' }, {}, 'Bearer token');

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when authorized', async () => {
    authServiceClient.validateOrganizationPermission.mockResolvedValue(true);
    authServiceClient.getUserRoleInOrganization.mockResolvedValue('OWNER');
    const request = {
      user: { sub: 'u1' },
      body: { organizationId: 'org1' },
      headers: { authorization: 'Bearer token' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.organizationRole).toBe('OWNER');
  });

  it('should get organizationId from params if not in body', async () => {
    authServiceClient.validateOrganizationPermission.mockResolvedValue(true);
    authServiceClient.getUserRoleInOrganization.mockResolvedValue('ORGANIZER');
    const context = createContext({ sub: 'u1' }, {}, { organizationId: 'org1' }, 'Bearer token');

    await guard.canActivate(context);

    expect(authServiceClient.validateOrganizationPermission).toHaveBeenCalledWith(
      'u1',
      'org1',
      'token',
    );
  });
});
