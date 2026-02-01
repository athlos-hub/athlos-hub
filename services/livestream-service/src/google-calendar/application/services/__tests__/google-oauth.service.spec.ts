import { BadRequestException } from '@nestjs/common';
import { GoogleOAuthService } from '../google-oauth.service';

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;
  let configService: any;
  let tokenRepository: any;

  beforeEach(() => {
    configService = {
      get: jest.fn((key) => {
        const config: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'client-123',
          GOOGLE_CLIENT_SECRET: 'secret-123',
          GOOGLE_REDIRECT_URI: 'http://localhost:3333/callback',
        };
        return config[key];
      }),
    };
    tokenRepository = { save: jest.fn(), findByUserId: jest.fn(), deleteByUserId: jest.fn() };
    service = new GoogleOAuthService(configService, tokenRepository);
  });

  it('should generate authorization url', () => {
    const url = service.getAuthorizationUrl('user-123', 'state-123');

    expect(url).toContain('accounts.google.com');
    expect(url).toContain('client_id=client-123');
    expect(url).toContain('state=state-123');
    expect(url).toContain('scope=https');
  });

  it('should use user id as state if not provided', () => {
    const url = service.getAuthorizationUrl('user-123');

    expect(url).toContain('state=user-123');
  });

  it('should throw when client id not configured', () => {
    configService.get = jest.fn((key) => {
      if (key === 'GOOGLE_CLIENT_ID') return null;
      return 'value';
    });
    service = new GoogleOAuthService(configService, tokenRepository);

    expect(() => service.getAuthorizationUrl('user-123')).toThrow(BadRequestException);
  });

  it('should include offline access in scope', () => {
    const url = service.getAuthorizationUrl('user-123');

    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  it('should construct full authorization url', () => {
    const url = service.getAuthorizationUrl('user-123');

    expect(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')).toBe(true);
  });
});
