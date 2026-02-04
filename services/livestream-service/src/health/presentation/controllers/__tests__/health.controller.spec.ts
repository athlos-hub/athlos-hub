import { HealthController } from '../health.controller';

describe('HealthController', () => {
  it('should return health info', () => {
    const controller = new HealthController();

    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.uptime).toBe('number');
  });
});
