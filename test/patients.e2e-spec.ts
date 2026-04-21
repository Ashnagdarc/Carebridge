import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Patient Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /patients/signup', () => {
    it('should successfully register a new patient', async () => {
      const signupPayload = {
        email: `patient-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/patients/signup')
        .send(signupPayload)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.patient.email).toBe(signupPayload.email);
      expect(response.body.patient).not.toHaveProperty('passwordHash');
    });

    it('should reject signup with duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      const signupPayload = {
        email,
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // First signup
      await request(app.getHttpServer())
        .post('/patients/signup')
        .send(signupPayload)
        .expect(201);

      // Duplicate signup
      await request(app.getHttpServer())
        .post('/patients/signup')
        .send(signupPayload)
        .expect(409);
    });

    it('should reject signup with invalid email', async () => {
      const invalidPayload = {
        email: 'not-an-email',
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app.getHttpServer())
        .post('/patients/signup')
        .send(invalidPayload)
        .expect(400);
    });

    it('should reject signup with weak password', async () => {
      const weakPasswordPayload = {
        email: `patient-${Date.now()}@example.com`,
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app.getHttpServer())
        .post('/patients/signup')
        .send(weakPasswordPayload)
        .expect(400);
    });

    it('should reject signup with missing required fields', async () => {
      const incompletePayload = {
        email: `patient-${Date.now()}@example.com`,
        password: 'SecurePassword123',
      };

      await request(app.getHttpServer())
        .post('/patients/signup')
        .send(incompletePayload)
        .expect(400);
    });
  });

  describe('POST /patients/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = `login-test-${Date.now()}@example.com`;
      testPassword = 'SecurePassword123';

      await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.patient.email).toBe(testEmail);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/patients/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        })
        .expect(401);
    });

    it('should reject login with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/patients/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        })
        .expect(401);
    });

    it('should reject login with missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/patients/login')
        .send({ email: testEmail })
        .expect(400);
    });
  });

  describe('GET /patients/profile', () => {
    let accessToken: string;

    beforeAll(async () => {
      const email = `profile-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email,
          password: 'SecurePassword123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      accessToken = response.body.accessToken;
    });

    it('should retrieve patient profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/patients/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject profile access without token', async () => {
      await request(app.getHttpServer())
        .get('/patients/profile')
        .expect(401);
    });

    it('should reject profile access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/patients/profile')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);
    });
  });

  describe('POST /patients/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const email = `refresh-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email,
          password: 'SecurePassword123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      refreshToken = response.body.refreshToken;
    });

    it('should generate new access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.tokenType).toBe('Bearer');
    });

    it('should reject refresh with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/patients/refresh')
        .send({ refreshToken: 'invalid_token' })
        .expect(401);
    });

    it('should reject refresh with missing token', async () => {
      await request(app.getHttpServer())
        .post('/patients/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /patients/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const email = `logout-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email,
          password: 'SecurePassword123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      accessToken = response.body.accessToken;
    });

    it('should successfully logout with valid token', async () => {
      await request(app.getHttpServer())
        .post('/patients/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer())
        .post('/patients/logout')
        .expect(401);
    });
  });

  describe('Full Patient Flow', () => {
    it('should complete signup → login → profile → logout flow', async () => {
      const email = `flow-${Date.now()}@example.com`;
      const password = 'SecurePassword123';

      // 1. Signup
      const signupResponse = await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email,
          password,
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(signupResponse.body.accessToken).toBeDefined();
      const signupToken = signupResponse.body.accessToken;

      // 2. Access profile with signup token
      const profileResponse = await request(app.getHttpServer())
        .get('/patients/profile')
        .set('Authorization', `Bearer ${signupToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(email);

      // 3. Logout
      await request(app.getHttpServer())
        .post('/patients/logout')
        .set('Authorization', `Bearer ${signupToken}`)
        .expect(204);

      // 4. Login again
      const loginResponse = await request(app.getHttpServer())
        .post('/patients/login')
        .send({ email, password })
        .expect(201);

      expect(loginResponse.body.accessToken).toBeDefined();
      const loginToken = loginResponse.body.accessToken;

      // 5. Access profile with login token
      const profile2Response = await request(app.getHttpServer())
        .get('/patients/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profile2Response.body.email).toBe(email);
    });
  });
});
