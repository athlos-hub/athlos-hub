export class LiveAlreadyFinishedException extends Error {
  constructor(liveId: string) {
    super(`Live ${liveId} já foi finalizada ou cancelada`);
    this.name = 'LiveAlreadyFinishedException';
  }
}
