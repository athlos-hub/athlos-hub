import { Live } from './live.entity';
import { LiveStatus } from '../enums/live-status.enum';
import { InvalidLiveTransitionException } from '../exceptions/invalid-live-transition.exception';
import { LiveAlreadyFinishedException } from '../exceptions/live-already-finished.exception';

describe('Live Entity', () => {
  it('should create a live with initial SCHEDULED status', () => {
    const live = new Live(
      'live-1',
      'match-1',
      'org-1',
      'stream-key',
      LiveStatus.SCHEDULED,
    );

    expect(live.id).toBe('live-1');
    expect(live.externalMatchId).toBe('match-1');
    expect(live.organizationId).toBe('org-1');
    expect(live.streamKey).toBe('stream-key');
    expect(live.status).toBe(LiveStatus.SCHEDULED);
  });

  describe('start', () => {
    it('should transition from SCHEDULED to LIVE', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      live.start();

      expect(live.status).toBe(LiveStatus.LIVE);
    });

    it('should set startedAt timestamp when starting', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      const beforeStart = new Date();
      live.start();
      const afterStart = new Date();

      expect(live.startedAt).not.toBeNull();
      expect(live.startedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeStart.getTime(),
      );
      expect(live.startedAt!.getTime()).toBeLessThanOrEqual(
        afterStart.getTime(),
      );
    });

    it('should throw error when starting a LIVE that is already live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      expect(() => live.start()).toThrow(InvalidLiveTransitionException);
    });

    it('should throw error when starting a FINISHED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.FINISHED,
      );

      expect(() => live.start()).toThrow(LiveAlreadyFinishedException);
    });

    it('should throw error when starting a CANCELLED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      expect(() => live.start()).toThrow(LiveAlreadyFinishedException);
    });
  });

  describe('finish', () => {
    it('should transition from LIVE to FINISHED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      live.finish();

      expect(live.status).toBe(LiveStatus.FINISHED);
    });

    it('should set endedAt timestamp when finishing', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      const beforeFinish = new Date();
      live.finish();
      const afterFinish = new Date();

      expect(live.endedAt).not.toBeNull();
      expect(live.endedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeFinish.getTime(),
      );
      expect(live.endedAt!.getTime()).toBeLessThanOrEqual(
        afterFinish.getTime(),
      );
    });

    it('should throw error when finishing a SCHEDULED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      expect(() => live.finish()).toThrow(InvalidLiveTransitionException);
    });

    it('should throw error when finishing a FINISHED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.FINISHED,
      );

      expect(() => live.finish()).toThrow(InvalidLiveTransitionException);
    });

    it('should throw error when finishing a CANCELLED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      expect(() => live.finish()).toThrow(InvalidLiveTransitionException);
    });
  });

  describe('cancel', () => {
    it('should transition from SCHEDULED to CANCELLED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      live.cancel();

      expect(live.status).toBe(LiveStatus.CANCELLED);
    });

    it('should set endedAt timestamp when cancelling', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      const beforeCancel = new Date();
      live.cancel();
      const afterCancel = new Date();

      expect(live.endedAt).not.toBeNull();
      expect(live.endedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeCancel.getTime(),
      );
      expect(live.endedAt!.getTime()).toBeLessThanOrEqual(afterCancel.getTime());
    });

    it('should throw error when cancelling a LIVE', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      expect(() => live.cancel()).toThrow(InvalidLiveTransitionException);
    });

    it('should throw error when cancelling a FINISHED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.FINISHED,
      );

      expect(() => live.cancel()).toThrow(InvalidLiveTransitionException);
    });

    it('should throw error when cancelling an already CANCELLED live', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      expect(() => live.cancel()).toThrow(InvalidLiveTransitionException);
    });
  });

  describe('isLive', () => {
    it('should return true when status is LIVE', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      expect(live.isLive()).toBe(true);
    });

    it('should return false when status is SCHEDULED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      expect(live.isLive()).toBe(false);
    });

    it('should return false when status is FINISHED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.FINISHED,
      );

      expect(live.isLive()).toBe(false);
    });

    it('should return false when status is CANCELLED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      expect(live.isLive()).toBe(false);
    });
  });

  describe('isScheduled', () => {
    it('should return true when status is SCHEDULED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      expect(live.isScheduled()).toBe(true);
    });

    it('should return false when status is LIVE', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      expect(live.isScheduled()).toBe(false);
    });

    it('should return false when status is FINISHED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.FINISHED,
      );

      expect(live.isScheduled()).toBe(false);
    });

    it('should return false when status is CANCELLED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      expect(live.isScheduled()).toBe(false);
    });
  });

  describe('hasEnded', () => {
    it('should return true when status is FINISHED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.FINISHED,
      );

      expect(live.hasEnded()).toBe(true);
    });

    it('should return true when status is CANCELLED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.CANCELLED,
      );

      expect(live.hasEnded()).toBe(true);
    });

    it('should return false when status is SCHEDULED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      expect(live.hasEnded()).toBe(false);
    });

    it('should return false when status is LIVE', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        new Date(),
      );

      expect(live.hasEnded()).toBe(false);
    });
  });

  describe('state transitions workflow', () => {
    it('should allow complete workflow: SCHEDULED -> LIVE -> FINISHED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      expect(live.status).toBe(LiveStatus.SCHEDULED);

      live.start();
      expect(live.status).toBe(LiveStatus.LIVE);

      live.finish();
      expect(live.status).toBe(LiveStatus.FINISHED);
    });

    it('should allow cancellation workflow: SCHEDULED -> CANCELLED', () => {
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.SCHEDULED,
      );

      expect(live.status).toBe(LiveStatus.SCHEDULED);

      live.cancel();
      expect(live.status).toBe(LiveStatus.CANCELLED);
    });
  });

  describe('getters', () => {
    it('should return all properties correctly', () => {
      const now = new Date();
      const live = new Live(
        'live-1',
        'match-1',
        'org-1',
        'stream-key',
        LiveStatus.LIVE,
        now,
        null,
        now,
      );

      expect(live.id).toBe('live-1');
      expect(live.externalMatchId).toBe('match-1');
      expect(live.organizationId).toBe('org-1');
      expect(live.streamKey).toBe('stream-key');
      expect(live.status).toBe(LiveStatus.LIVE);
      expect(live.startedAt).toBe(now);
      expect(live.endedAt).toBeNull();
      expect(live.createdAt).toBe(now);
    });
  });
});
