import { Inject, Injectable } from '@nestjs/common';
import type { IChatRepository } from '../../domain/repositories/chat.interface.js';

@Injectable()
export class ChatService {
  constructor(
    @Inject('IChatRepository')
    private chatRepo: IChatRepository,
  ) {}

  async sendMessage(
    liveId: string,
    userId: string,
    userName: string,
    message: string,
  ): Promise<void> {
    await this.chatRepo.publishMessage(liveId, {
      userId,
      userName,
      message,
      timestamp: new Date(),
    });
  }

  async getRecentMessages(liveId: string, limit?: number) {
    return this.chatRepo.getRecentMessages(liveId, limit);
  }
}
