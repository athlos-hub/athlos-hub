import { MatchEventType } from '../../domain/enums/match-event-type.enum.js';

export class MatchEventResponseDto {
  id!: string;
  liveId!: string;
  type!: MatchEventType;
  payload!: Record<string, unknown>;
  timestamp!: string;

  static fromEntity(event: {
    id: string;
    liveId: string;
    type: MatchEventType;
    payload: Record<string, unknown>;
    timestamp: { toISOString(): string };
  }): MatchEventResponseDto {
    const dto = new MatchEventResponseDto();
    dto.id = event.id;
    dto.liveId = event.liveId;
    dto.type = event.type;
    dto.payload = event.payload;
    dto.timestamp = event.timestamp.toISOString();
    return dto;
  }
}
