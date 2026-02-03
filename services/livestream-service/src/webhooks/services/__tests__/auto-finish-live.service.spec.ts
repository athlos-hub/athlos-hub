import { Test, TestingModule } from '@nestjs/testing';
import { AutoFinishLiveService } from '../auto-finish-live.service';
import { Live } from '../../../lives/domain/entities/live.entity';
import { LiveStatus } from '../../../lives/domain/enums/live-status.enum';

describe('AutoFinishLiveService', () => {
  let service: AutoFinishLiveService;
  let streamKeyRepo: {
    findLiveIdByStreamKey: jest.Mock;
    markAsInactive: jest.Mock;
  };
  let liveRepo: {
    findById: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    streamKeyRepo = {
      findLiveIdByStreamKey: jest.fn(),
      markAsInactive: jest.fn(),
    };
    liveRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoFinishLiveService,
        { provide: 'IStreamKeyRepository', useValue: streamKeyRepo },
        { provide: 'ILiveRepository', useValue: liveRepo },
      ],
    }).compile();

    service = module.get(AutoFinishLiveService);
  });

  it('should return when stream key not found', async () => {
    streamKeyRepo.findLiveIdByStreamKey.mockResolvedValue(null);

    await service.execute('key-1');

    expect(streamKeyRepo.markAsInactive).not.toHaveBeenCalled();
    expect(liveRepo.findById).not.toHaveBeenCalled();
  });

  it('should return when live not found', async () => {
    streamKeyRepo.findLiveIdByStreamKey.mockResolvedValue('live-1');
    liveRepo.findById.mockResolvedValue(null);

    await service.execute('key-1');

    expect(streamKeyRepo.markAsInactive).toHaveBeenCalledWith('key-1');
    expect(liveRepo.findById).toHaveBeenCalledWith('live-1');
    expect(liveRepo.save).not.toHaveBeenCalled();
  });

  it('should return when live is not active', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.SCHEDULED);
    streamKeyRepo.findLiveIdByStreamKey.mockResolvedValue('live-1');
    liveRepo.findById.mockResolvedValue(live);

    await service.execute('key-1');

    expect(liveRepo.save).not.toHaveBeenCalled();
  });

  it('should finish live when active', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE);
    streamKeyRepo.findLiveIdByStreamKey.mockResolvedValue('live-1');
    liveRepo.findById.mockResolvedValue(live);

    await service.execute('key-1');

    expect(liveRepo.save).toHaveBeenCalledWith(live);
  });

  it('should throw when finishing fails', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE);
    jest.spyOn(live, 'finish').mockImplementation(() => {
      throw new Error('fail');
    });
    streamKeyRepo.findLiveIdByStreamKey.mockResolvedValue('live-1');
    liveRepo.findById.mockResolvedValue(live);

    await expect(service.execute('key-1')).rejects.toThrow('fail');
  });
});
