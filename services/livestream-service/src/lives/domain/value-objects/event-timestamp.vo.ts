export class EventTimestamp {
  private readonly value: Date;

  constructor(date?: Date) {
    this.value = date || new Date();
  }

  getValue(): Date {
    return this.value;
  }

  toISOString(): string {
    return this.value.toISOString();
  }

  static now(): EventTimestamp {
    return new EventTimestamp();
  }

  static fromDate(date: Date): EventTimestamp {
    return new EventTimestamp(date);
  }
}
