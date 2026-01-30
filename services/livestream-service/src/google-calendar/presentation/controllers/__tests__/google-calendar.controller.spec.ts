import { GoogleCalendarController } from '../google-calendar.controller';
import { GoogleCalendarService } from '../../../application/services/google-calendar.service';
import { GoogleCalendarApiService } from '../../../application/services/google-calendar-api.service';
import {
  GenerateCalendarUrlDto,
  GenerateMultipleCalendarUrlsDto,
  CreateCalendarEventDto,
  CreateMultipleCalendarEventsDto,
} from '../../dto/generate-calendar-url.dto';

describe('GoogleCalendarController', () => {
  let controller: GoogleCalendarController;
  let calendarService: { generateCalendarUrl: jest.Mock; generateMultipleCalendarUrls: jest.Mock };
  let apiService: {
    createEvent: jest.Mock;
    createMultipleEvents: jest.Mock;
    checkMultipleEventsExistence: jest.Mock;
  };

  beforeEach(() => {
    calendarService = {
      generateCalendarUrl: jest.fn(),
      generateMultipleCalendarUrls: jest.fn(),
    };
    apiService = {
      createEvent: jest.fn(),
      createMultipleEvents: jest.fn(),
      checkMultipleEventsExistence: jest.fn(),
    };

    controller = new GoogleCalendarController(
      calendarService as unknown as GoogleCalendarService,
      apiService as unknown as GoogleCalendarApiService,
    );
  });

  it('should generate calendar url with dto base url', async () => {
    const dto: GenerateCalendarUrlDto = { liveId: 'live-1', frontendBaseUrl: 'http://front' };
    calendarService.generateCalendarUrl.mockResolvedValue('url-1');

    const result = await controller.generateCalendarUrl(dto);

    expect(calendarService.generateCalendarUrl).toHaveBeenCalledWith('live-1', 'http://front');
    expect(result.url).toBe('url-1');
  });

  it('should generate multiple calendar urls', async () => {
    const dto: GenerateMultipleCalendarUrlsDto = {
      liveIds: ['l1', 'l2'],
      frontendBaseUrl: 'http://front',
    };
    calendarService.generateMultipleCalendarUrls.mockResolvedValue([
      { liveId: 'l1', url: 'u1' },
      { liveId: 'l2', url: 'u2' },
    ]);

    const result = await controller.generateMultipleCalendarUrls(dto);

    expect(calendarService.generateMultipleCalendarUrls).toHaveBeenCalledWith(['l1', 'l2'], 'http://front');
    expect(result).toHaveLength(2);
  });

  it('should generate calendar url by query', async () => {
    calendarService.generateCalendarUrl.mockResolvedValue('url-1');

    const result = await controller.generateCalendarUrlByQuery('live-1', 'http://front');

    expect(calendarService.generateCalendarUrl).toHaveBeenCalledWith('live-1', 'http://front');
    expect(result.url).toBe('url-1');
  });

  it('should create event', async () => {
    const dto: CreateCalendarEventDto = { liveId: 'live-1', force: true } as any;
    apiService.createEvent.mockResolvedValue({
      eventId: 'e1',
      htmlLink: 'http://calendar',
      alreadyExists: false,
    });

    const result = await controller.createEvent({ sub: 'user-1' } as any, dto);

    expect(apiService.createEvent).toHaveBeenCalledWith('user-1', 'live-1', 'http://localhost:3000', true);
    expect(result.success).toBe(true);
  });

  it('should create multiple events', async () => {
    const dto: CreateMultipleCalendarEventsDto = { liveIds: ['l1'], force: false } as any;
    apiService.createMultipleEvents.mockResolvedValue([{ liveId: 'l1', eventId: 'e1' }]);

    const result = await controller.createMultipleEvents({ sub: 'user-1' } as any, dto);

    expect(apiService.createMultipleEvents).toHaveBeenCalledWith('user-1', ['l1'], 'http://localhost:3000', false);
    expect(result.success).toBe(true);
  });

  it('should check events existence', async () => {
    apiService.checkMultipleEventsExistence.mockResolvedValue([{ liveId: 'l1', exists: true }]);

    const result = await controller.getEventsExistence({ sub: 'user-1' } as any, 'l1,l2');

    expect(apiService.checkMultipleEventsExistence).toHaveBeenCalledWith('user-1', ['l1', 'l2']);
    expect(result.results).toHaveLength(1);
  });
});
