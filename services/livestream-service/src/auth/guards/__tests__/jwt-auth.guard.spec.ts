import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('should return user when valid', () => {
    const guard = new JwtAuthGuard();
    const user = { sub: 'user-1' } as any;

    const result = guard.handleRequest(null, user, null);

    expect(result).toBe(user);
  });

  it('should throw when error provided', () => {
    const guard = new JwtAuthGuard();
    const err = new Error('fail');

    expect(() => guard.handleRequest(err, null, null)).toThrow(err);
  });

  it('should throw UnauthorizedException when no user', () => {
    const guard = new JwtAuthGuard();

    expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
  });
});
