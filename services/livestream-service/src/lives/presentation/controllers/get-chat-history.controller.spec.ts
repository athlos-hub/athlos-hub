import { Test, TestingModule } from '@nestjs/testing';
import { GetChatHistoryController } from './get-chat-history.controller';
import { ChatService } from '../../application/services/chat.service';

describe('GetChatHistoryController', () => {
  let controller: GetChatHistoryController;
  let chatService: ChatService;

  const mockChatService = {
    getRecentMessages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetChatHistoryController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<GetChatHistoryController>(GetChatHistoryController);
    chatService = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChatHistory', () => {
    it('should return chat history with default limit', async () => {
      const liveId = 'live-123';
      const messages = [
        {
          userId: 'user-1',
          userName: 'User 1',
          message: 'Hello',
          timestamp: new Date(),
        },
        {
          userId: 'user-2',
          userName: 'User 2',
          message: 'Hi',
          timestamp: new Date(),
        },
      ];

      mockChatService.getRecentMessages.mockResolvedValue(messages);

      const result = await controller.getChatHistory(liveId);

      expect(result).toEqual({
        messages,
        count: 2,
      });
      expect(mockChatService.getRecentMessages).toHaveBeenCalledWith(
        liveId,
        50,
      );
    });

    it('should return chat history with custom limit', async () => {
      const liveId = 'live-456';
      const messages = [
        {
          userId: 'user-1',
          userName: 'User 1',
          message: 'Test message',
          timestamp: new Date(),
        },
      ];

      mockChatService.getRecentMessages.mockResolvedValue(messages);

      const result = await controller.getChatHistory(liveId, '10');

      expect(result).toEqual({
        messages,
        count: 1,
      });
      expect(mockChatService.getRecentMessages).toHaveBeenCalledWith(
        liveId,
        10,
      );
    });

    it('should return empty messages array', async () => {
      const liveId = 'live-789';

      mockChatService.getRecentMessages.mockResolvedValue([]);

      const result = await controller.getChatHistory(liveId);

      expect(result).toEqual({
        messages: [],
        count: 0,
      });
    });

    it('should parse limit string correctly', async () => {
      const liveId = 'live-123';
      mockChatService.getRecentMessages.mockResolvedValue([]);

      await controller.getChatHistory(liveId, '25');

      expect(mockChatService.getRecentMessages).toHaveBeenCalledWith(
        liveId,
        25,
      );
    });

    it('should include count property in response', async () => {
      const liveId = 'live-123';
      const messages = [
        { userId: '1', userName: 'U1', message: 'M1', timestamp: new Date() },
        { userId: '2', userName: 'U2', message: 'M2', timestamp: new Date() },
        { userId: '3', userName: 'U3', message: 'M3', timestamp: new Date() },
      ];

      mockChatService.getRecentMessages.mockResolvedValue(messages);

      const result = await controller.getChatHistory(liveId);

      expect(result.count).toBe(3);
      expect(result.messages).toHaveLength(3);
    });
  });
});
