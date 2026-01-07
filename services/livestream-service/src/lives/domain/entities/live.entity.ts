import { LiveStatus } from '../enums/live-status.enum.js';
import { InvalidLiveTransitionException } from '../exceptions/invalid-live-transition.exception.js';
import { LiveAlreadyFinishedException } from '../exceptions/live-already-finished.exception.js';

export class Live {
  private _id: string;
  private _externalMatchId: string;
  private _organizationId: string;
  private _streamKey: string;
  private _status: LiveStatus;
  private _startedAt: Date | null;
  private _endedAt: Date | null;
  private _createdAt: Date;

  constructor(
    id: string,
    externalMatchId: string,
    organizationId: string,
    streamKey: string,
    status: LiveStatus,
    startedAt: Date | null = null,
    endedAt: Date | null = null,
    createdAt: Date = new Date(),
  ) {
    this._id = id;
    this._externalMatchId = externalMatchId;
    this._organizationId = organizationId;
    this._streamKey = streamKey;
    this._status = status;
    this._startedAt = startedAt;
    this._endedAt = endedAt;
    this._createdAt = createdAt;
  }

  get id(): string {
    return this._id;
  }

  get externalMatchId(): string {
    return this._externalMatchId;
  }

  get organizationId(): string {
    return this._organizationId;
  }

  get streamKey(): string {
    return this._streamKey;
  }

  get status(): LiveStatus {
    return this._status;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get endedAt(): Date | null {
    return this._endedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  start(): void {
    this.ensureNotFinished();

    if (this._status !== LiveStatus.SCHEDULED) {
      throw new InvalidLiveTransitionException(this._status, LiveStatus.LIVE);
    }

    this._status = LiveStatus.LIVE;
    this._startedAt = new Date();
  }

  finish(): void {
    if (this._status !== LiveStatus.LIVE) {
      throw new InvalidLiveTransitionException(this._status, LiveStatus.FINISHED);
    }

    this._status = LiveStatus.FINISHED;
    this._endedAt = new Date();
  }

  cancel(): void {
    if (this._status !== LiveStatus.SCHEDULED) {
      throw new InvalidLiveTransitionException(this._status, LiveStatus.CANCELLED);
    }

    this._status = LiveStatus.CANCELLED;
    this._endedAt = new Date();
  }

  isLive(): boolean {
    return this._status === LiveStatus.LIVE;
  }

  isScheduled(): boolean {
    return this._status === LiveStatus.SCHEDULED;
  }

  hasEnded(): boolean {
    return this._status === LiveStatus.FINISHED || this._status === LiveStatus.CANCELLED;
  }

  private ensureNotFinished(): void {
    if (this.hasEnded()) {
      throw new LiveAlreadyFinishedException(this._id);
    }
  }
}
