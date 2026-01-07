import { Live } from '../entities/live.entity.js';
import { LiveStatus } from '../enums/live-status.enum.js';

export interface ILiveRepository {
  create(data: {
    externalMatchId: string;
    organizationId: string;
    streamKey: string;
    status: LiveStatus;
  }): Promise<Live>;

  findById(id: string): Promise<Live | null>;

  updateStatus(id: string, status: LiveStatus): Promise<Live>;

  save(live: Live): Promise<Live>;
}
