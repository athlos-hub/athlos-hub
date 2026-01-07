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
import type { IChatRepository } from '../../domain/repositories/chat.interface.js';

interface JoinLiveRoomPayload {
  liveId: string;
}

interface ChatMessagePayload {
  liveId: string;
  userId: string;
  userName: string;
  message: string;
}

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

  constructor(
    @Inject('IChatRepository')
    private chatRepo: IChatRepository,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join-live')
  async handleJoinLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinLiveRoomPayload,
  ) {
    const { liveId } = payload;
    const room = `live:${liveId}`;

    await client.join(room);
    this.logger.log(`Cliente ${client.id} entrou na sala ${room}`);

    if (!this.activeRooms.has(liveId)) {
      await this.subscribeToLiveChat(liveId);
      this.activeRooms.add(liveId);
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

  private async subscribeToLiveChat(liveId: string) {
    await this.chatRepo.subscribe(liveId, (message) => {
      const room = `live:${liveId}`;

      this.server.to(room).emit('chat-message', message);
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

  emitMatchEvent(liveId: string, eventData: unknown) {
    this.emitLiveEvent(liveId, 'match-event', eventData);
  }
}
