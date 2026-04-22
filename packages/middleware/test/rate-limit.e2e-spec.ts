import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  const originalWindowMs = process.env.RATE_LIMIT_WINDOW_MS;
  const originalMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS;

  beforeAll(async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '1000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '2';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (originalWindowMs === undefined) delete process.env.RATE_LIMIT_WINDOW_MS;
    else process.env.RATE_LIMIT_WINDOW_MS = originalWindowMs;

    if (originalMaxRequests === undefined) delete process.env.RATE_LIMIT_MAX_REQUESTS;
    else process.env.RATE_LIMIT_MAX_REQUESTS = originalMaxRequests;

    await app.close();
  });

  it('returns 429 after exceeding limit within the window', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/v1/health').expect(200);
    await request(server).get('/api/v1/health').expect(200);
    await request(server).get('/api/v1/health').expect(429);
  });
});
