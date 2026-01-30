import { Test, TestingModule } from '@nestjs/testing';
import { OnPublishDoneWebhookController } from '../on-publish-done-webhook.controller';
import { AutoFinishLiveService } from '../../services/auto-finish-live.service';
import { OnPublishDoneWebhookDto } from '../../dto/on-publish-done-webhook.dto';

describe('OnPublishDoneWebhookController', () => {
  let controller: OnPublishDoneWebhookController;
  let autoFinishLiveService: { execute: jest.Mock };

  beforeEach(async () => {
    autoFinishLiveService = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnPublishDoneWebhookController],
      providers: [
        { provide: AutoFinishLiveService, useValue: autoFinishLiveService },
      ],
    }).compile();

    controller = module.get(OnPublishDoneWebhookController);
  });

  it('should do nothing when stream key is empty', async () => {
    const dto: OnPublishDoneWebhookDto = {
      path: '/',
      protocol: 'rtmp',
    };

    await controller.onPublishDone(dto);

    expect(autoFinishLiveService.execute).not.toHaveBeenCalled();
  });

  it('should call auto finish service with stream key', async () => {
    const dto: OnPublishDoneWebhookDto = {
      path: '/stream-key',
      protocol: 'rtmp',
    };

    await controller.onPublishDone(dto);

    expect(autoFinishLiveService.execute).toHaveBeenCalledWith('stream-key');
  });

  it('should swallow errors from service', async () => {
    const dto: OnPublishDoneWebhookDto = {
      path: '/stream-key',
      protocol: 'rtmp',
    };
    autoFinishLiveService.execute.mockRejectedValue(new Error('fail'));

    await controller.onPublishDone(dto);

    expect(autoFinishLiveService.execute).toHaveBeenCalledWith('stream-key');
  });
});
