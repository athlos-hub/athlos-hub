import { validate } from 'class-validator';
import { OnPublishDoneWebhookDto } from '../on-publish-done-webhook.dto';

describe('OnPublishDoneWebhookDto', () => {
  it('should validate required fields', async () => {
    const dto = new OnPublishDoneWebhookDto();

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with valid data', async () => {
    const dto = new OnPublishDoneWebhookDto();
    dto.path = '/stream-key';
    dto.protocol = 'rtmp';
    dto.query = 'token=1';
    dto.ip = '127.0.0.1';
    dto.user = 'user';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
