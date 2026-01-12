export interface IChatRepository {
  publishMessage(
    liveId: string,
    message: {
      userId: string;
      userName: string;
      message: string;
      timestamp: Date;
    },
  ): Promise<void>;

  subscribe(
    liveId: string,
    callback: (message: {
      userId: string;
      userName: string;
      message: string;
      timestamp: Date;
    }) => void,
  ): Promise<void>;

  unsubscribe(liveId: string): Promise<void>;

  getRecentMessages(
    liveId: string,
    limit?: number,
  ): Promise<
    Array<{
      userId: string;
      userName: string;
      message: string;
      timestamp: Date;
    }>
  >;

  saveMessageToHistory(
    liveId: string,
    message: {
      userId: string;
      userName: string;
      message: string;
      timestamp: Date;
    },
  ): Promise<void>;
}
