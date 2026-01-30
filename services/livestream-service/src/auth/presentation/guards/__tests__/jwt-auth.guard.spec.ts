import { JwtAuthGuard } from '../jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let context: any;
  let request: any;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    request = { user: { id: 'user-1', email: 'user@example.com' } };
    context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request with valid user', () => {
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should reject request without user', () => {
    request.user = undefined;

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should get request from context', () => {
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should handle null request gracefully', () => {
    context = {
      switchToHttp: () => ({
        getRequest: () => null,
      }),
    } as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should work with different user objects', () => {
    request.user = { id: 'user-2', roles: ['admin'] };

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
