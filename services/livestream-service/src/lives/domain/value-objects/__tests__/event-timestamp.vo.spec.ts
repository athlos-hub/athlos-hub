import { EventTimestamp } from '../event-timestamp.vo';

describe('EventTimestamp', () => {
  it('should create with current time by default', () => {
    const before = new Date();
    const timestamp = new EventTimestamp();
    const after = new Date();

    expect(timestamp.getValue().getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getValue().getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should return ISO string', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const timestamp = new EventTimestamp(date);

    expect(timestamp.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should create from date', () => {
    const date = new Date('2024-05-01T10:00:00.000Z');
    const timestamp = EventTimestamp.fromDate(date);

    expect(timestamp.getValue()).toBe(date);
  });

  it('should create with now helper', () => {
    const timestamp = EventTimestamp.now();

    expect(timestamp).toBeInstanceOf(EventTimestamp);
  });
});
