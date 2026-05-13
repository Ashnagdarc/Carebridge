import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule Health Check', () => {
  let appModule: TestingModule;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  });

  afterAll(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
      return;
    }
    process.env.JWT_SECRET = previousJwtSecret;
  });

  it('should compile the AppModule successfully', async () => {
    appModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(appModule).toBeDefined();
  });
});
