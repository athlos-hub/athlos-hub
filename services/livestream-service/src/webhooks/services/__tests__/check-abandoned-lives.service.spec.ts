import { Test, TestingModule } from '@nestjs/testing';
import { CheckAbandonedLivesService } from '../check-abandoned-lives.service';
import { Live } from '../../../lives/domain/entities/live.entity';
import { LiveStatus } from '../../../lives/domain/enums/live-status.enum';

describe('CheckAbandonedLivesService', () => {
  let service: CheckAbandonedLivesService;
  let liveRepo: {
    findMany: jest.Mock;
    save: jest.Mock;
  };
  let streamKeyRepo: {
    isActive: jest.Mock;
    markAsInactive: jest.Mock;
  };

  beforeEach(async () => {
    liveRepo = {
      findMany: jest.fn(),
      save: jest.fn(),
    };
    streamKeyRepo = {
      isActive: jest.fn(),
      markAsInactive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckAbandonedLivesService,
        { provide: 'ILiveRepository', useValue: liveRepo },
        { provide: 'IStreamKeyRepository', useValue: streamKeyRepo },
      ],
    }).compile();

    service = module.get(CheckAbandonedLivesService);
  });

  it('should return when no active lives', async () => {
    liveRepo.findMany.mockResolvedValue([]);

    await service.checkAbandonedLives();

    expect(streamKeyRepo.isActive).not.toHaveBeenCalled();
  });

  it('should not finish when stream is active', async () => {
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE, new Date());
    liveRepo.findMany.mockResolvedValue([live]);
    streamKeyRepo.isActive.mockResolvedValue(true);

    await service.checkAbandonedLives();

    expect(liveRepo.save).not.toHaveBeenCalled();
    expect(streamKeyRepo.markAsInactive).not.toHaveBeenCalled();
  });

  it('should finish abandoned live', async () => {
    const startedAt = new Date(Date.now() - 16 * 60 * 1000);
    const live = new Live('live-1', 'match-1', 'org-1', 'key-1', LiveStatus.LIVE, startedAt);
    liveRepo.findMany.mockResolvedValue([live]);
    streamKeyRepo.isActive.mockResolvedValue(false);

    await service.checkAbandonedLives();

    expect(liveRepo.save).toHaveBeenCalledWith(live);
    expect(streamKeyRepo.markAsInactive).toHaveBeenCalledWith('key-1');
  });

  it('should handle errors during check', async () => {
    liveRepo.findMany.mockRejectedValue(new Error('fail'));

    await service.checkAbandonedLives();

    expect(streamKeyRepo.isActive).not.toHaveBeenCalled();
  });

  it('should trigger check via checkNow', async () => {
    liveRepo.findMany.mockResolvedValue([]);
    const spy = jest.spyOn(service, 'checkAbandonedLives');

    await service.checkNow();

    expect(spy).toHaveBeenCalled();
  });
});
