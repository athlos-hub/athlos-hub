import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionsClientService } from '../competitions-client.service';
import { EnvService } from '../../../config/env.service';

// Mock global fetch
global.fetch = jest.fn();

describe('CompetitionsClientService', () => {
  let service: CompetitionsClientService;
  let envService: { get: jest.Mock };

  beforeEach(async () => {
    envService = {
      get: jest.fn().mockReturnValue('http://competitions-service:8001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionsClientService,
        { provide: EnvService, useValue: envService },
      ],
    }).compile();

    service = module.get(CompetitionsClientService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start match successfully', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ status: 'live' }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await service.startMatch('match-123');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://competitions-service:8001/api/matches/match-123/start',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  it('should not throw error when competitions service fails', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Não deve propagar o erro
    await expect(service.startMatch('match-123')).resolves.not.toThrow();
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Não deve propagar o erro
    await expect(service.startMatch('match-123')).resolves.not.toThrow();
  });
});
