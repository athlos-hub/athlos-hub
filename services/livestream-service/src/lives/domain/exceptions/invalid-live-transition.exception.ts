import { LiveStatus } from '../enums/live-status.enum.js';

export class InvalidLiveTransitionException extends Error {
  constructor(
    public readonly currentStatus: LiveStatus,
    public readonly targetStatus: LiveStatus,
  ) {
    super(
      `Transição ao vivo inválida: não é possível alterar de ${currentStatus} para ${targetStatus}`,
    );
    this.name = 'InvalidLiveTransitionException';
  }
}
