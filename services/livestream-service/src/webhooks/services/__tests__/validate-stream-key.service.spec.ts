import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidateStreamKeyService } from '../validate-stream-key.service';
import { Live } from '../../../lives/domain/entities/live.entity';
import { LiveStatus } from '../../../lives/domain/enums/live-status.enum';

describe('ValidateStreamKeyService', () => {
  let service: ValidateStreamKeyService;
  let streamKeyRepo: {
    getMetadata: jest.Mock;
    markAsActive: jest.Mock;
  };
  let liveRepo: {
    findById: jest.Mock;
    save: jest.Mock;
  };
  let competitionsClient: {
    startMatch: jest.Mock;
  };

  beforeEach(async () => {
    streamKeyRepo = {
      getMetadata: jest.fn(),
      markAsActive: jest.fn(),
    };
    liveRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    competitionsClient = {
      startMatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateStreamKeyService,
        { provide: 'IStreamKeyRepository', useValue: streamKeyRepo },
        { provide: 'ILiveRepository', useValue: liveRepo },
        { provide: 'CompetitionsClientService', useValue: competitionsClient },
      ],
    }).compile();

    service = module.get(ValidateStreamKeyService);
  });

  it('should throw when metadata not found', async () => {
    streamKeyRepo.getMetadata.mockResolvedValue(null);

    await expect(service.execute('key-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw when live not found', async () => {
    streamKeyRepo.getMetadata.mockResolvedValue({ liveId: 'live-1' });
    liveRepo.findById.mockResolvedValue(null);

    await expect(service.execute('key-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw when live status invalid', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.FINISHED);
    streamKeyRepo.getMetadata.mockResolvedValue({ liveId: 'live-1' });
    liveRepo.findById.mockResolvedValue(live);

    await expect(service.execute('key-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('should start live when scheduled', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED);
    streamKeyRepo.getMetadata.mockResolvedValue({ liveId: 'live-1' });
    liveRepo.findById.mockResolvedValue(live);

    const result = await service.execute('key-1');

    expect(streamKeyRepo.markAsActive).toHaveBeenCalledWith('key-1');
    expect(liveRepo.save).toHaveBeenCalledWith(live);
    expect(competitionsClient.startMatch).toHaveBeenCalledWith('match-1');
    expect(result).toBe('live-1');
  });

  it('should allow live when already live', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE);
    streamKeyRepo.getMetadata.mockResolvedValue({ liveId: 'live-1' });
    liveRepo.findById.mockResolvedValue(live);

    const result = await service.execute('key-1');

    expect(streamKeyRepo.markAsActive).toHaveBeenCalledWith('key-1');
    expect(liveRepo.save).not.toHaveBeenCalled();
    expect(result).toBe('live-1');
  });
});
