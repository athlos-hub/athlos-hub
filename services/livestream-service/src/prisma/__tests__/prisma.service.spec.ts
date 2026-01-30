import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  it('should connect and disconnect on module lifecycle', async () => {
    const env = { databaseUrl: 'postgresql://test' } as any;
    const service = new PrismaService(env);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect((service as any).$connect).toHaveBeenCalled();
    expect((service as any).$disconnect).toHaveBeenCalled();
  });
});
