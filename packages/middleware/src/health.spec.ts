import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule Health Check', () => {
  let appModule: TestingModule;

  it('should compile the AppModule successfully', async () => {
    appModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(appModule).toBeDefined();
  });
});
