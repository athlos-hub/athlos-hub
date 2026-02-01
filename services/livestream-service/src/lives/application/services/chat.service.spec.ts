import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let mockChatRepository: {
    publishMessage: jest.Mock;
    getRecentMessages: jest.Mock;
  };

  beforeEach(async () => {
    mockChatRepository = {
      publishMessage: jest.fn(),
      getRecentMessages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: 'IChatRepository',
          useValue: mockChatRepository,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should publish a message to chat', async () => {
      const liveId = 'live-123';
      const userId = 'user-456';
      const userName = 'John Doe';
      const message = 'Hello, this is a test message';

      mockChatRepository.publishMessage.mockResolvedValue(undefined);

      await service.sendMessage(liveId, userId, userName, message);

      expect(mockChatRepository.publishMessage).toHaveBeenCalledWith(
        liveId,
        expect.objectContaining({
          userId,
          userName,
          message,
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should include current timestamp in message', async () => {
      const liveId = 'live-123';
      const userId = 'user-456';
      const userName = 'John Doe';
      const message = 'Test message';

      const beforeTime = new Date();
      mockChatRepository.publishMessage.mockResolvedValue(undefined);

      await service.sendMessage(liveId, userId, userName, message);

      const afterTime = new Date();
      const callArgs = mockChatRepository.publishMessage.mock.calls[0][1];

      expect(callArgs.timestamp).toBeInstanceOf(Date);
      expect(callArgs.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(callArgs.timestamp.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });

    it('should preserve all message properties', async () => {
      const liveId = 'live-123';
      const userId = 'user-456';
      const userName = 'Jane Smith';
      const message = 'Another test message';

      mockChatRepository.publishMessage.mockResolvedValue(undefined);

      await service.sendMessage(liveId, userId, userName, message);

      const callArgs = mockChatRepository.publishMessage.mock.calls[0][1];

      expect(callArgs.userId).toBe(userId);
      expect(callArgs.userName).toBe(userName);
      expect(callArgs.message).toBe(message);
    });
  });

  describe('getRecentMessages', () => {
    it('should get recent messages without limit', async () => {
      const liveId = 'live-123';
      const messages = [
        {
          userId: 'user-1',
          userName: 'User 1',
          message: 'Message 1',
          timestamp: new Date(),
        },
        {
          userId: 'user-2',
          userName: 'User 2',
          message: 'Message 2',
          timestamp: new Date(),
        },
      ];

      mockChatRepository.getRecentMessages.mockResolvedValue(messages);

      const result = await service.getRecentMessages(liveId);

      expect(result).toEqual(messages);
      expect(mockChatRepository.getRecentMessages).toHaveBeenCalledWith(
        liveId,
        undefined,
      );
    });

    it('should get recent messages with limit', async () => {
      const liveId = 'live-123';
      const limit = 10;
      const messages = [
        {
          userId: 'user-1',
          userName: 'User 1',
          message: 'Message 1',
          timestamp: new Date(),
        },
      ];

      mockChatRepository.getRecentMessages.mockResolvedValue(messages);

      const result = await service.getRecentMessages(liveId, limit);

      expect(result).toEqual(messages);
      expect(mockChatRepository.getRecentMessages).toHaveBeenCalledWith(
        liveId,
        limit,
      );
    });

    it('should return empty array when no messages found', async () => {
      const liveId = 'live-123';

      mockChatRepository.getRecentMessages.mockResolvedValue([]);

      const result = await service.getRecentMessages(liveId);

      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const liveId = 'live-123';
      const limit = 5;
      const messages = Array.from({ length: 5 }, (_, i) => ({
        userId: `user-${i}`,
        userName: `User ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(),
      }));

      mockChatRepository.getRecentMessages.mockResolvedValue(messages);

      const result = await service.getRecentMessages(liveId, limit);

      expect(result.length).toBeLessThanOrEqual(limit);
      expect(mockChatRepository.getRecentMessages).toHaveBeenCalledWith(
        liveId,
        limit,
      );
    });
  });
});
