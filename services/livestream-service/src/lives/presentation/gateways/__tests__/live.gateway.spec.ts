import { LiveGateway } from '../live.gateway';
import { MatchEvent } from '../../../domain/entities/match-event.entity';
import { MatchEventType } from '../../../domain/enums/match-event-type.enum';
import { EventTimestamp } from '../../../domain/value-objects/event-timestamp.vo';

describe('LiveGateway', () => {
  let gateway: LiveGateway;
  let chatRepo: {
    publishMessage: jest.Mock;
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
  };
  let eventRepo: {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    getRecentEvents: jest.Mock;
  };
  let serverToRoom: { emit: jest.Mock };
  let server: {
    to: jest.Mock;
    in: jest.Mock;
  };

  beforeEach(() => {
    chatRepo = {
      publishMessage: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };
    eventRepo = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getRecentEvents: jest.fn(),
    };

    serverToRoom = { emit: jest.fn() };
    server = {
      to: jest.fn().mockReturnValue(serverToRoom),
      in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([]) }),
    };

    gateway = new LiveGateway(chatRepo as any, eventRepo as any);
    gateway.server = server as any;
  });

  it('should join live and emit events history', async () => {
    const client = {
      id: 'c1',
      rooms: new Set(['c1']),
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as any;

    const event = MatchEvent.create(
      'e1',
      'live-1',
      MatchEventType.GOAL,
      { team: 'A' },
      EventTimestamp.fromDate(new Date('2024-01-01')),
    );
    eventRepo.getRecentEvents.mockResolvedValue([event]);

    const result = await gateway.handleJoinLive(client, { liveId: 'live-1' });

    expect(client.join).toHaveBeenCalledWith('live:live-1');
    expect(eventRepo.subscribe).toHaveBeenCalledWith('live-1', expect.any(Function));
    expect(chatRepo.subscribe).toHaveBeenCalledWith('live-1', expect.any(Function));
    expect(client.emit).toHaveBeenCalledWith('events-history', [event.toJSON()]);
    expect(result).toEqual({
      event: 'joined-live',
      data: { liveId: 'live-1', message: 'Conectado à live' },
    });
  });

  it('should not emit events history if already in room', async () => {
    const client = {
      id: 'c1',
      rooms: new Set(['c1', 'live:live-1']),
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as any;

    eventRepo.getRecentEvents.mockResolvedValue([]);

    await gateway.handleJoinLive(client, { liveId: 'live-1' });

    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalledWith('events-history', expect.anything());
  });

  it('should not resubscribe when live already active', async () => {
    const client1 = {
      id: 'c1',
      rooms: new Set(['c1']),
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as any;

    const client2 = {
      id: 'c2',
      rooms: new Set(['c2']),
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as any;

    eventRepo.getRecentEvents.mockResolvedValue([]);

    await gateway.handleJoinLive(client1, { liveId: 'live-1' });
    await gateway.handleJoinLive(client2, { liveId: 'live-1' });

    expect(eventRepo.subscribe).toHaveBeenCalledTimes(1);
    expect(chatRepo.subscribe).toHaveBeenCalledTimes(1);
  });

  it('should leave live and unsubscribe when room empty', async () => {
    const client = {
      id: 'c1',
      rooms: new Set(['c1']),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as any;

    eventRepo.getRecentEvents.mockResolvedValue([]);

    await gateway.handleJoinLive(client, { liveId: 'live-1' });

    const result = await gateway.handleLeaveLive(client, { liveId: 'live-1' });

    expect(client.leave).toHaveBeenCalledWith('live:live-1');
    expect(chatRepo.unsubscribe).toHaveBeenCalledWith('live-1');
    expect(eventRepo.unsubscribe).toHaveBeenCalledWith('live-1');
    expect(result).toEqual({
      event: 'left-live',
      data: { liveId: 'live-1', message: 'Desconectado da live' },
    });
  });

  it('should publish chat messages within rate limit', async () => {
    const client = {
      id: 'c1',
      emit: jest.fn(),
    } as any;

    const result = await gateway.handleChatMessage(client, {
      liveId: 'live-1',
      userId: 'u1',
      userName: 'User',
      message: 'Hello',
    });

    expect(chatRepo.publishMessage).toHaveBeenCalledWith('live-1', {
      userId: 'u1',
      userName: 'User',
      message: 'Hello',
      timestamp: expect.any(Date),
    });
    expect(result).toEqual({
      event: 'chat-message-sent',
      data: { success: true },
    });
  });

  it('should reject chat messages when rate limit exceeded', async () => {
    const client = {
      id: 'c1',
      emit: jest.fn(),
    } as any;

    for (let i = 0; i < 5; i++) {
      await gateway.handleChatMessage(client, {
        liveId: 'live-1',
        userId: 'u1',
        userName: 'User',
        message: `msg-${i}`,
      });
    }

    const result = await gateway.handleChatMessage(client, {
      liveId: 'live-1',
      userId: 'u1',
      userName: 'User',
      message: 'msg-5',
    });

    expect(client.emit).toHaveBeenCalledWith('rate-limit-exceeded', {
      message: 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.',
      retryAfter: expect.any(Number),
    });
    expect(result).toEqual({
      event: 'chat-message-error',
      data: { success: false, error: 'rate_limit_exceeded' },
    });
  });

  it('should clean up old rate limits on disconnect', () => {
    const gatewayAny = gateway as any;
    const now = Date.now();
    gatewayAny.chatRateLimits.set('u1', { count: 1, resetAt: now - gatewayAny.CHAT_WINDOW_MS * 3 });

    gateway.handleDisconnect({ id: 'c1' } as any);

    expect(gatewayAny.chatRateLimits.size).toBe(0);
  });

  it('should emit live events to room', () => {
    gateway.emitLiveEvent('live-1', 'custom-event', { value: 1 });

    expect(server.to).toHaveBeenCalledWith('live:live-1');
    expect(serverToRoom.emit).toHaveBeenCalledWith('live-event', {
      eventType: 'custom-event',
      data: { value: 1 },
      timestamp: expect.any(Date),
    });
  });

  it('should emit live status changes', () => {
    gateway.emitLiveStatusChange('live-1', 'live');

    expect(serverToRoom.emit).toHaveBeenCalledWith('live-event', {
      eventType: 'status-change',
      data: { status: 'live' },
      timestamp: expect.any(Date),
    });
  });
});
