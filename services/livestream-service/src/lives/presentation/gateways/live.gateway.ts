import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LiveGateway.name);

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

    return {
      event: 'left-live',
      data: { liveId, message: 'Desconectado da live' },
    };
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatMessagePayload) {
    const { liveId, userId, userName, message } = payload;
    const room = `live:${liveId}`;

    client.to(room).emit('chat-message', {
      userId,
      userName,
      message,
      timestamp: new Date(),
    });

    this.logger.log(`Mensagem de chat na sala ${room} de ${userName}: ${message}`);

    return {
      event: 'chat-message-sent',
      data: { success: true },
    };
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
