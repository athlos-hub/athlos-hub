import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../jwt.strategy';

describe('JwtStrategy', () => {
  it('should validate payload', async () => {
    const strategy = new JwtStrategy();

    const result = await strategy.validate({
      sub: 'user-1',
      email: 'test@example.com',
      preferred_username: 'user',
      email_verified: true,
    });

    expect(result.sub).toBe('user-1');
  });

  it('should throw when payload is invalid', async () => {
    const strategy = new JwtStrategy();

    await expect(strategy.validate({
      sub: '',
      email: '',
      preferred_username: 'user',
      email_verified: true,
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
