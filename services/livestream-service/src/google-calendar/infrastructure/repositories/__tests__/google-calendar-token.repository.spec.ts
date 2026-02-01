import { GoogleCalendarTokenRepository } from '../google-calendar-token.repository';

describe('GoogleCalendarTokenRepository', () => {
  let repository: GoogleCalendarTokenRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      googleCalendarToken: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new GoogleCalendarTokenRepository(prisma);
  });

  it('should save token', async () => {
    const data = {
      userId: 'u1',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: new Date(),
      scope: 'calendar',
    };

    await repository.save(data);

    expect(prisma.googleCalendarToken.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
      create: expect.objectContaining({
        userId: 'u1',
        accessToken: 'access',
      }),
    });
  });

  it('should find token by user id', async () => {
    prisma.googleCalendarToken.findUnique.mockResolvedValue({
      userId: 'u1',
      accessToken: 'token',
    });

    const result = await repository.findByUserId('u1');

    expect(prisma.googleCalendarToken.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(result.userId).toBe('u1');
  });

  it('should delete token by user id', async () => {
    await repository.deleteByUserId('u1');

    expect(prisma.googleCalendarToken.delete).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
  });
});
