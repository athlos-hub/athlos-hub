import { validate } from 'class-validator';
import { MediaMTXAuthDto } from '../mediamtx-auth.dto';

describe('MediaMTXAuthDto', () => {
  it('should validate required fields', async () => {
    const dto = new MediaMTXAuthDto();

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with valid data', async () => {
    const dto = new MediaMTXAuthDto();
    dto.ip = '127.0.0.1';
    dto.path = '/live/stream-key';
    dto.protocol = 'rtmp';
    dto.action = 'publish';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should require user when provided', async () => {
    const dto = new MediaMTXAuthDto();
    dto.ip = '127.0.0.1';
    dto.path = '/live/stream-key';
    dto.protocol = 'rtmp';
    dto.action = 'publish';
    dto.user = 1 as any;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
