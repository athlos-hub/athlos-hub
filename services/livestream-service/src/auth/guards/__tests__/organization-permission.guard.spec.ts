import { ForbiddenException } from '@nestjs/common';
import { OrganizationPermissionGuard } from '../organization-permission.guard';
import { AuthServiceClient } from '../../services/auth-service-client';

describe('OrganizationPermissionGuard', () => {
  let guard: OrganizationPermissionGuard;
  let authServiceClient: jest.Mocked<Pick<AuthServiceClient, 'getOrganizationPermissionDetails'>>;

  beforeEach(() => {
    authServiceClient = {
      getOrganizationPermissionDetails: jest.fn(),
    };

    guard = new OrganizationPermissionGuard(authServiceClient as AuthServiceClient);
  });

  const createContext = (user: unknown, body?: unknown, params?: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          body,
          params,
        }),
      }),
    }) as Parameters<OrganizationPermissionGuard['canActivate']>[0];

  it('should throw when user not authenticated', async () => {
    const context = createContext(null, {}, {});

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw when organizationId missing', async () => {
    const context = createContext({ sub: 'u1' }, {}, {});

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw when permission denied', async () => {
    authServiceClient.getOrganizationPermissionDetails.mockResolvedValue({
      hasPermission: false,
      role: 'NONE',
    });
    const context = createContext({ sub: 'u1' }, { organizationId: 'org1' }, {});

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when authorized', async () => {
    authServiceClient.getOrganizationPermissionDetails.mockResolvedValue({
      hasPermission: true,
      role: 'OWNER',
    });
    const request = {
      user: { sub: 'u1' },
      body: { organizationId: 'org1' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as Parameters<OrganizationPermissionGuard['canActivate']>[0];

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect((request as { organizationRole?: string }).organizationRole).toBe('OWNER');
  });

  it('should get organizationId from params if not in body', async () => {
    authServiceClient.getOrganizationPermissionDetails.mockResolvedValue({
      hasPermission: true,
      role: 'ORGANIZER',
    });
    const context = createContext({ sub: 'u1' }, {}, { organizationId: 'org1' });

    await guard.canActivate(context);

    expect(authServiceClient.getOrganizationPermissionDetails).toHaveBeenCalledWith('u1', 'org1');
  });
});
