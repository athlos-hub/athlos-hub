import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from '../../application/services/chat.service.js';

@Controller('lives')
export class GetChatHistoryController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':id/chat/history')
  @HttpCode(HttpStatus.OK)
  async getChatHistory(
    @Param('id') liveId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    const messages = await this.chatService.getRecentMessages(liveId, limitNumber);
    
    return {
      messages,
      count: messages.length,
    };
  }
}
