import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { IChatRepository } from '../../domain/repositories/chat.interface.js';
import type { IEventRepository } from '../../domain/repositories/event.interface.js';

interface JoinLiveRoomPayload {
  liveId: string;
}

interface ChatMessagePayload {
  liveId: string;
  userId: string;
  userName: string;
  message: string;
}

@SkipThrottle()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/lives',
})
export class LiveGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LiveGateway.name);
  private activeRooms = new Set<string>();
  
  private chatRateLimits = new Map<string, { count: number; resetAt: number }>();
  private readonly CHAT_MESSAGE_LIMIT = 5;
  private readonly CHAT_WINDOW_MS = 10000;

  constructor(
    @Inject('IChatRepository')
    private chatRepo: IChatRepository,
    @Inject('IEventRepository')
    private eventRepo: IEventRepository,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    this.cleanupOldRateLimits();
  }

  @SubscribeMessage('join-live')
  async handleJoinLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinLiveRoomPayload,
  ) {
    const { liveId } = payload;
    const room = `live:${liveId}`;

    const rooms = Array.from(client.rooms);
    const alreadyInRoom = rooms.includes(room);

    if (!alreadyInRoom) {
      await client.join(room);
      this.logger.log(`Cliente ${client.id} entrou na sala ${room}`);
    }

    if (!this.activeRooms.has(liveId)) {
      await this.subscribeToLiveChat(liveId);
      await this.subscribeToLiveEvents(liveId);
      this.activeRooms.add(liveId);
    }

    if (!alreadyInRoom) {
      const recentEvents = await this.eventRepo.getRecentEvents(liveId, 50);
      client.emit(
        'events-history',
        recentEvents.map((e) => e.toJSON()),
      );
    }

    return {
      event: 'joined-live',
      data: { liveId, message: 'Conectado à live' },
    };
  }

  @SubscribeMessage('leave-live')
  async handleLeaveLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinLiveRoomPayload,
  ) {
    const { liveId } = payload;
    const room = `live:${liveId}`;

    await client.leave(room);
    this.logger.log(`Cliente ${client.id} saiu da sala ${room}`);

    const roomSize = (await this.server.in(room).fetchSockets()).length;
    if (roomSize === 0 && this.activeRooms.has(liveId)) {
      await this.chatRepo.unsubscribe(liveId);
      await this.eventRepo.unsubscribe(liveId);
      this.activeRooms.delete(liveId);
    }

    return {
      event: 'left-live',
      data: { liveId, message: 'Desconectado da live' },
    };
  }

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessagePayload,
  ) {
    const { liveId, userId, userName, message } = payload;

    if (!this.checkChatRateLimit(userId)) {
      this.logger.warn(
        `Rate limit excedido para usuário ${userId} (${userName}) na live ${liveId}`,
      );
      client.emit('rate-limit-exceeded', {
        message: 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.',
        retryAfter: this.getChatRateLimitRetryAfter(userId),
      });
      return {
        event: 'chat-message-error',
        data: { success: false, error: 'rate_limit_exceeded' },
      };
    }

    await this.chatRepo.publishMessage(liveId, {
      userId,
      userName,
      message,
      timestamp: new Date(),
    });

    this.logger.log(`Mensagem de chat da live ${liveId} de ${userName}: ${message}`);

    return {
      event: 'chat-message-sent',
      data: { success: true },
    };
  }

  private checkChatRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.chatRateLimits.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      this.chatRateLimits.set(userId, {
        count: 1,
        resetAt: now + this.CHAT_WINDOW_MS,
      });
      return true;
    }

    if (userLimit.count >= this.CHAT_MESSAGE_LIMIT) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private getChatRateLimitRetryAfter(userId: string): number {
    const userLimit = this.chatRateLimits.get(userId);
    if (!userLimit) return 0;

    const now = Date.now();
    return Math.max(0, Math.ceil((userLimit.resetAt - now) / 1000));
  }

  private cleanupOldRateLimits() {
    const now = Date.now();
    for (const [userId, limit] of this.chatRateLimits.entries()) {
      if (now > limit.resetAt + this.CHAT_WINDOW_MS * 2) {
        this.chatRateLimits.delete(userId);
      }
    }
  }

  private async subscribeToLiveChat(liveId: string) {
    await this.chatRepo.subscribe(liveId, (message) => {
      const room = `live:${liveId}`;

      this.server.to(room).emit('chat-message', message);
    });
  }

  private async subscribeToLiveEvents(liveId: string) {
    await this.eventRepo.subscribe(liveId, (event) => {
      const room = `live:${liveId}`;

      this.server.to(room).emit('match-event', event.toJSON());

      this.logger.log(`Evento ${event.type} transmitido para sala ${room}`);
    });
  }

  emitLiveEvent(liveId: string, eventType: string, data: unknown) {
    const room = `live:${liveId}`;

    this.server.to(room).emit('live-event', {
      eventType,
      data,
      timestamp: new Date(),
    });

    this.logger.log(`Evento ${eventType} emitido para sala ${room}`);
  }

  emitLiveStatusChange(liveId: string, status: string) {
    this.emitLiveEvent(liveId, 'status-change', { status });
  }
}
