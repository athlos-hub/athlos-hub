export interface IStreamKeyRepository {
  save(liveId: string, streamKey: string, ttlInSeconds?: number): Promise<void>;

  findLiveIdByStreamKey(streamKey: string): Promise<string | null>;

  isValid(streamKey: string): Promise<boolean>;

  delete(streamKey: string): Promise<void>;

  markAsActive(streamKey: string): Promise<void>;

  isActive(streamKey: string): Promise<boolean>;

  markAsInactive(streamKey: string): Promise<void>;
}
