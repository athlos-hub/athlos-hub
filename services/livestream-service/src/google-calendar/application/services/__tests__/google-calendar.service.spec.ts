import { NotFoundException } from '@nestjs/common';
import { GoogleCalendarService } from '../google-calendar.service';

enum LiveStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
}

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let liveRepository: { findById: jest.Mock };

  beforeEach(() => {
    liveRepository = { findById: jest.fn() };
    service = new GoogleCalendarService(liveRepository as any);
  });

  const createLive = (id = 'live-1', status = LiveStatus.SCHEDULED) => {
    const live = {
      id,
      externalMatchId: 'match-1',
      organizationId: 'org-1',
      streamKey: 'key-1',
      status,
      startedAt: null as Date | null,
      createdAt: new Date('2024-02-01'),
      isScheduled: () => status === LiveStatus.SCHEDULED,
      start: (date: Date) => {
        live.startedAt = date;
        live.status = LiveStatus.LIVE;
      },
    };
    return live as any;
  };

  it('should throw when live not found', async () => {
    liveRepository.findById.mockResolvedValue(null);

    await expect(service.generateCalendarUrl('live-1', 'http://front')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should generate calendar url for scheduled live', async () => {
    const live = createLive();
    liveRepository.findById.mockResolvedValue(live);

    const url = await service.generateCalendarUrl('live-1', 'http://front');

    expect(url).toContain('calendar.google.com');
    expect(url).toContain('match-1');
    expect(url).toContain('dates=');
    expect(liveRepository.findById).toHaveBeenCalledWith('live-1');
  });

  it('should generate multiple calendar urls', async () => {
    const live1 = createLive('live-1');
    const live2 = createLive('live-2');
    liveRepository.findById.mockImplementation((id) => {
      if (id === 'live-1') return Promise.resolve(live1);
      if (id === 'live-2') return Promise.resolve(live2);
      return Promise.resolve(null);
    });

    const urls = await service.generateMultipleCalendarUrls(['live-1', 'live-2'], 'http://front');

    expect(urls).toHaveLength(2);
    expect(urls[0].liveId).toBe('live-1');
    expect(urls[1].liveId).toBe('live-2');
    expect(urls[0].url).toContain('calendar.google.com');
  });

  it('should throw when no valid lives in multiple', async () => {
    liveRepository.findById.mockResolvedValue(null);

    await expect(
      service.generateMultipleCalendarUrls(['live-1'], 'http://front'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should handle partial valid lives in multiple', async () => {
    const live1 = createLive('live-1');
    liveRepository.findById.mockImplementation((id) => {
      if (id === 'live-1') return Promise.resolve(live1);
      return Promise.resolve(null);
    });

    const urls = await service.generateMultipleCalendarUrls(['live-1', 'invalid'], 'http://front');

    expect(urls).toHaveLength(1);
    expect(urls[0].liveId).toBe('live-1');
  });

  it('should use startedAt if available', async () => {
    const live = createLive('live-1', LiveStatus.LIVE);
    const startedAt = new Date('2024-02-01T10:00:00Z');
    live.start(startedAt);
    liveRepository.findById.mockResolvedValue(live);

    const url = await service.generateCalendarUrl('live-1', 'http://front');

    expect(url).toContain('20240201T10');
  });

  it('should include organization id in description', async () => {
    const live = createLive();
    liveRepository.findById.mockResolvedValue(live);

    const url = await service.generateCalendarUrl('live-1', 'http://front');

    expect(url).toContain('org-1');
  });

  it('should include frontend url in description', async () => {
    const live = createLive();
    liveRepository.findById.mockResolvedValue(live);

    const url = await service.generateCalendarUrl('live-1', 'http://front');

    expect(url).toContain('live-1');
  });
});
