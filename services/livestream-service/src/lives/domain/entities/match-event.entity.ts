import { MatchEventType } from '../enums/match-event-type.enum.js';
import { EventTimestamp } from '../value-objects/event-timestamp.vo.js';

export interface MatchEventProps {
  id: string;
  liveId: string;
  type: MatchEventType;
  payload: Record<string, unknown>;
  timestamp: EventTimestamp;
}

export class MatchEvent {
  private readonly props: MatchEventProps;

  constructor(props: MatchEventProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get liveId(): string {
    return this.props.liveId;
  }

  get type(): MatchEventType {
    return this.props.type;
  }

  get payload(): Record<string, unknown> {
    return this.props.payload;
  }

  get timestamp(): EventTimestamp {
    return this.props.timestamp;
  }

  static create(
    id: string,
    liveId: string,
    type: MatchEventType,
    payload: Record<string, unknown>,
    timestamp?: EventTimestamp,
  ): MatchEvent {
    return new MatchEvent({
      id,
      liveId,
      type,
      payload,
      timestamp: timestamp || EventTimestamp.now(),
    });
  }

  toJSON() {
    return {
      id: this.id,
      liveId: this.liveId,
      type: this.type,
      payload: this.payload,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
