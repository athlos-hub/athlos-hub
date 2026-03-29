import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const mockConfig = (trust = true, env: 'dev' | 'prod' = 'dev') =>
    ({
      get: jest.fn((key: string) => {
        if (key === 'TRUST_GATEWAY') return trust;
        if (key === 'ENV') return env;
        return undefined;
      }),
    }) as unknown as ConfigService;

  const createContext = (headers: Record<string, string>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as ExecutionContext;

  it('should set user from gateway headers', () => {
    const guard = new JwtAuthGuard(mockConfig());
    const req: { headers: Record<string, string>; user?: unknown } = {
      headers: {
        'x-keycloak-sub': 'sub-1',
        'x-keycloak-email': 'a@b.com',
        'x-keycloak-preferred-username': 'user1',
        'x-keycloak-roles': 'user,admin',
      },
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect((req as { user: { sub: string } }).user.sub).toBe('sub-1');
  });

  it('should throw when X-Keycloak-Sub missing', () => {
    const guard = new JwtAuthGuard(mockConfig());
    const ctx = createContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should accept X-Test-Sub when TRUST_GATEWAY is false and not prod', () => {
    const guard = new JwtAuthGuard(mockConfig(false, 'dev'));
    const req: { headers: Record<string, string>; user?: unknown } = {
      headers: { 'x-test-sub': 'test-sub-1' },
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
    expect((req as { user: { sub: string } }).user.sub).toBe('test-sub-1');
  });
});
