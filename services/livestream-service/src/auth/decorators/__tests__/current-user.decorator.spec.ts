import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../current-user.decorator';

describe('CurrentUser decorator', () => {
  it('should return user from request', () => {
    class DummyController {
      handler(@CurrentUser() _user: any) {
        return _user;
      }
    }

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'user-1' } }),
      }),
    } as any;

    const metadata =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, DummyController.prototype, 'handler') ||
      Reflect.getMetadata(ROUTE_ARGS_METADATA, DummyController, 'handler');

    expect(metadata).toBeDefined();

    const paramMetadata = Object.values(metadata)[0] as any;
    const factory = paramMetadata.factory as (data: unknown, ctx: any) => any;

    const result = factory(null, ctx);

    expect(result).toEqual({ sub: 'user-1' });
  });
});
