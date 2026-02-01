import { BadRequestException } from '@nestjs/common';
import { GoogleOAuthController } from '../google-oauth.controller';
import { GoogleOAuthService } from '../../../application/services/google-oauth.service';

describe('GoogleOAuthController', () => {
  let controller: GoogleOAuthController;
  let oauthService: {
    getAuthorizationUrl: jest.Mock;
    exchangeCodeForTokens: jest.Mock;
    saveTokens: jest.Mock;
    isAuthorized: jest.Mock;
    revokeAuthorization: jest.Mock;
  };

  beforeEach(() => {
    oauthService = {
      getAuthorizationUrl: jest.fn(),
      exchangeCodeForTokens: jest.fn(),
      saveTokens: jest.fn(),
      isAuthorized: jest.fn(),
      revokeAuthorization: jest.fn(),
    };

    controller = new GoogleOAuthController(oauthService as unknown as GoogleOAuthService);
  });

  it('should redirect to authorization url', async () => {
    const res = { redirect: jest.fn() } as any;
    oauthService.getAuthorizationUrl.mockReturnValue('http://auth');

    await controller.authorize({ sub: 'user-1' } as any, res, 'http://redirect');

    expect(oauthService.getAuthorizationUrl).toHaveBeenCalledWith('user-1', 'user-1|http://redirect');
    expect(res.redirect).toHaveBeenCalledWith('http://auth');
  });

  it('should return authorize url', async () => {
    oauthService.getAuthorizationUrl.mockReturnValue('http://auth');

    const result = await controller.getAuthorizeUrl({ sub: 'user-1' } as any, undefined);

    expect(result).toEqual({ url: 'http://auth' });
  });

  it('should redirect when error is provided', async () => {
    const res = { redirect: jest.fn() } as any;

    await controller.callback('', '', 'denied', res);

    expect(res.redirect).toHaveBeenCalledWith('/?error=oauth_cancelled&message=denied');
  });

  it('should redirect when code missing', async () => {
    const res = { redirect: jest.fn() } as any;

    await controller.callback('', 'user-1', '', res);

    expect(res.redirect).toHaveBeenCalledWith(
      '/?error=oauth_failed&message=C%C3%B3digo%20de%20autoriza%C3%A7%C3%A3o%20n%C3%A3o%20fornecido',
    );
  });

  it('should redirect when state invalid', async () => {
    const res = { redirect: jest.fn() } as any;
    oauthService.exchangeCodeForTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 1,
      scope: 's',
    });

    await controller.callback('code', '', '', res);

    expect(res.redirect).toHaveBeenCalledWith(
      '/?error=oauth_failed&message=State%20inv%C3%A1lido',
    );
  });

  it('should handle callback success', async () => {
    const res = { redirect: jest.fn() } as any;
    oauthService.exchangeCodeForTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 1,
      scope: 's',
    });

    await controller.callback('code', 'user-1|/path', '', res);

    expect(oauthService.saveTokens).toHaveBeenCalledWith('user-1', 'a', 'r', 1, 's');
    expect(res.redirect).toHaveBeenCalledWith('/path');
  });

  it('should redirect on callback error', async () => {
    const res = { redirect: jest.fn() } as any;
    oauthService.exchangeCodeForTokens.mockRejectedValue(new BadRequestException('fail'));

    await controller.callback('code', 'user-1', '', res);

    expect(res.redirect).toHaveBeenCalledWith('/?error=oauth_failed&message=fail');
  });

  it('should return authorization status', async () => {
    oauthService.isAuthorized.mockResolvedValue(true);

    const result = await controller.getStatus({ sub: 'user-1' } as any);

    expect(result).toEqual({ authorized: true });
  });

  it('should revoke authorization', async () => {
    const result = await controller.revoke({ sub: 'user-1' } as any);

    expect(oauthService.revokeAuthorization).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ message: 'Autorização revogada com sucesso' });
  });
});
