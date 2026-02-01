export class PrismaClient {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  live: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  matchEvent: {
    create: jest.Mock;
    findMany: jest.Mock;
  };

  constructor(_options?: unknown) {
    this.$connect = jest.fn();
    this.$disconnect = jest.fn();
    this.live = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    this.matchEvent = {
      create: jest.fn(),
      findMany: jest.fn(),
    };
  }
}
