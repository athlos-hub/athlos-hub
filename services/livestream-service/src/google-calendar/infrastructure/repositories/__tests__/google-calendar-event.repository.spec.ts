import { GoogleCalendarEventRepository } from '../google-calendar-event.repository';

describe('GoogleCalendarEventRepository', () => {
  let repository: GoogleCalendarEventRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      googleCalendarEvent: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    repository = new GoogleCalendarEventRepository(prisma);
  });

  it('should save event', async () => {
    const data = {
      userId: 'u1',
      liveId: 'live-1',
      eventId: 'event-1',
      htmlLink: 'http://calendar',
    };

    await repository.save(data);

    expect(prisma.googleCalendarEvent.upsert).toHaveBeenCalled();
  });

  it('should find event by user and live', async () => {
    prisma.googleCalendarEvent.findUnique.mockResolvedValue({
      eventId: 'e1',
    });

    const result = await repository.findByUserIdAndLiveId('u1', 'live-1');

    expect(prisma.googleCalendarEvent.findUnique).toHaveBeenCalledWith({
      where: { userId_liveId: { userId: 'u1', liveId: 'live-1' } },
    });
    expect(result?.eventId).toBe('e1');
  });

  it('should delete event', async () => {
    await repository.deleteByUserIdAndLiveId('u1', 'live-1');

    expect(prisma.googleCalendarEvent.delete).toHaveBeenCalled();
  });

  it('should find all by user', async () => {
    prisma.googleCalendarEvent.findMany.mockResolvedValue([
      { eventId: 'e1', liveId: 'live-1' },
    ]);

    const results = await repository.findByUserId('u1');

    expect(prisma.googleCalendarEvent.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(results).toHaveLength(1);
  });
});
