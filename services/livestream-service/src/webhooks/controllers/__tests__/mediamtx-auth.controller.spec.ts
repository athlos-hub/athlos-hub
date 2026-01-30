import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MediaMTXAuthController } from '../mediamtx-auth.controller';
import { ValidateStreamKeyService } from '../../services/validate-stream-key.service';
import { MediaMTXAuthDto } from '../../dto/mediamtx-auth.dto';

describe('MediaMTXAuthController', () => {
  let controller: MediaMTXAuthController;
  let validateStreamKeyService: { execute: jest.Mock };

  beforeEach(async () => {
    validateStreamKeyService = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaMTXAuthController],
      providers: [
        { provide: ValidateStreamKeyService, useValue: validateStreamKeyService },
      ],
    }).compile();

    controller = module.get(MediaMTXAuthController);
  });

  it('should authenticate publish action', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'publish',
      path: '/live/stream-key',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };
    validateStreamKeyService.execute.mockResolvedValue('live-1');

    await controller.authenticate(dto);

    expect(validateStreamKeyService.execute).toHaveBeenCalledWith('stream-key');
  });

  it('should handle publish action with query in path', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'publish',
      path: '/live/stream-key?token=abc',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };
    validateStreamKeyService.execute.mockResolvedValue('live-1');

    await controller.authenticate(dto);

    expect(validateStreamKeyService.execute).toHaveBeenCalledWith('stream-key');
  });

  it('should allow read action without validation', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'read',
      path: '/live/stream-key',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };

    await controller.authenticate(dto);

    expect(validateStreamKeyService.execute).not.toHaveBeenCalled();
  });

  it('should ignore unknown action', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'unknown',
      path: '/live/stream-key',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };

    await controller.authenticate(dto);

    expect(validateStreamKeyService.execute).not.toHaveBeenCalled();
  });

  it('should throw when stream key is empty', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'publish',
      path: '/live',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };

    await expect(controller.authenticate(dto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should rethrow UnauthorizedException from service', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'publish',
      path: '/live/stream-key',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };
    validateStreamKeyService.execute.mockRejectedValue(
      new UnauthorizedException('invalid'),
    );

    await expect(controller.authenticate(dto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw generic UnauthorizedException on unexpected errors', async () => {
    const dto: MediaMTXAuthDto = {
      action: 'publish',
      path: '/live/stream-key',
      ip: '127.0.0.1',
      protocol: 'rtmp',
    };
    validateStreamKeyService.execute.mockRejectedValue(new Error('fail'));

    await expect(controller.authenticate(dto)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
