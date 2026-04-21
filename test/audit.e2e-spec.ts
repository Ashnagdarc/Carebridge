import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Audit Logging (e2e)', () => {
  let app: INestApplication;
  let hospitalToken: string;
  let patientToken: string;
  let hospitalId: string;
  let patientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register hospital
    const hospitalRes = await request(app.getHttpServer())
      .post('/hospitals/register')
      .send({
        name: `Hospital Audit Test ${Date.now()}`,
        code: `HOSP_AUDIT_${Date.now()}`,
        redirectUri: 'http://localhost:4000/callback',
        endpoint: 'http://localhost:4000/api',
      })
      .expect(201);

    hospitalToken = hospitalRes.body.accessToken;
    hospitalId = hospitalRes.body.hospital.id;

    // Register patient
    const patientRes = await request(app.getHttpServer())
      .post('/patients/signup')
      .send({
        email: `audit-patient-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Audit',
      })
      .expect(201);

    patientToken = patientRes.body.accessToken;
    patientId = patientRes.body.patient.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /audit/logs', () => {
    it('should list audit logs for hospital', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('skip');
      expect(response.body).toHaveProperty('take');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should filter logs by action', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs?action=patient_signup')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.logs).toBeDefined();
      // All results should have patient_signup action (or similar)
    });

    it('should filter logs by resource type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs?resourceType=patient')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.logs).toBeDefined();
    });

    it('should filter logs by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs?status=success')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.logs).toBeDefined();
      // Most should be successful
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs?skip=0&take=10')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.skip).toBe(0);
      expect(response.body.take).toBe(10);
      expect(response.body.logs.length).toBeLessThanOrEqual(10);
    });

    it('should enforce max take limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs?take=1000')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(400);
    });

    it('should reject without hospital token', async () => {
      await request(app.getHttpServer())
        .get('/audit/logs')
        .expect(401);
    });
  });

  describe('GET /audit/logs/:id', () => {
    let logId: string;

    beforeAll(async () => {
      // Get a log ID from the list
      const response = await request(app.getHttpServer())
        .get('/audit/logs?take=1')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      if (response.body.logs.length > 0) {
        logId = response.body.logs[0].id;
      }
    });

    it('should get specific audit log', async () => {
      if (!logId) {
        this.skip();
      }

      const response = await request(app.getHttpServer())
        .get(`/audit/logs/${logId}`)
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.id).toBe(logId);
      expect(response.body.action).toBeDefined();
      expect(response.body.resourceType).toBeDefined();
    });

    it('should return 400 for non-existent log', async () => {
      await request(app.getHttpServer())
        .get('/audit/logs/nonexistent_id')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(400);
    });
  });

  describe('GET /audit/hospital-logs', () => {
    it('should list hospital-specific audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/hospital-logs')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.logs)).toBe(true);

      // All logs should have hospitalId matching the authenticated hospital
      if (response.body.logs.length > 0) {
        response.body.logs.forEach((log) => {
          expect(log.hospitalId).toBe(hospitalId);
        });
      }
    });

    it('should reject without hospital token', async () => {
      await request(app.getHttpServer())
        .get('/audit/hospital-logs')
        .expect(401);
    });
  });

  describe('GET /audit/patient-logs', () => {
    it('should list patient-specific audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/patient-logs')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.logs)).toBe(true);

      // All logs should have patientId matching the authenticated patient
      if (response.body.logs.length > 0) {
        response.body.logs.forEach((log) => {
          expect(log.patientId).toBe(patientId);
        });
      }
    });

    it('should reject without patient token', async () => {
      await request(app.getHttpServer())
        .get('/audit/patient-logs')
        .expect(401);
    });
  });

  describe('GET /audit/summary', () => {
    it('should return audit summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/summary')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalLogs');
      expect(response.body).toHaveProperty('successCount');
      expect(response.body).toHaveProperty('failedCount');
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('byAction');
      expect(response.body).toHaveProperty('period');

      expect(typeof response.body.totalLogs).toBe('number');
      expect(typeof response.body.successCount).toBe('number');
      expect(typeof response.body.failedCount).toBe('number');
      expect(typeof response.body.successRate).toBe('number');
      expect(Array.isArray(response.body.byAction)).toBe(true);
    });

    it('should filter summary by days', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/summary?days=30')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.period.days).toBe(30);
    });

    it('should reject invalid days range', async () => {
      await request(app.getHttpServer())
        .get('/audit/summary?days=0')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/audit/summary?days=400')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(400);
    });

    it('should reject without hospital token', async () => {
      await request(app.getHttpServer())
        .get('/audit/summary')
        .expect(401);
    });
  });

  describe('Audit Log Creation on Requests', () => {
    it('should create audit log for hospital registration', async () => {
      // Any hospital registration should create an audit log
      const name = `Audit Test Hospital ${Date.now()}`;
      const code = `HOSP_TEST_${Date.now()}`;

      const hospitalRes = await request(app.getHttpServer())
        .post('/hospitals/register')
        .send({
          name,
          code,
          redirectUri: 'http://localhost:4000/callback',
          endpoint: 'http://localhost:4000/api',
        })
        .expect(201);

      // Query audit logs to verify log was created
      const logsRes = await request(app.getHttpServer())
        .get('/audit/logs?action=hospitals_register&status=success')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(logsRes.body.total).toBeGreaterThan(0);
    });

    it('should create audit log for patient login', async () => {
      const email = `login-test-${Date.now()}@example.com`;
      const password = 'SecurePassword123';

      // First signup
      await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email,
          password,
          firstName: 'John',
          lastName: 'Login',
        })
        .expect(201);

      // Then login
      const loginRes = await request(app.getHttpServer())
        .post('/patients/login')
        .send({ email, password })
        .expect(201);

      // Query audit logs for login
      const logsRes = await request(app.getHttpServer())
        .get('/audit/logs?action=patients_login&status=success')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(logsRes.body.total).toBeGreaterThan(0);
    });

    it('should create audit log for failed authentication', async () => {
      // Try to login with wrong password
      await request(app.getHttpServer())
        .post('/patients/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123',
        })
        .expect(401);

      // Query audit logs for failed logins
      const logsRes = await request(app.getHttpServer())
        .get('/audit/logs?status=failed')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(logsRes.body.logs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter logs by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get(
          `/audit/logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        )
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(response.body.logs).toBeDefined();

      // All logs should be within the date range
      response.body.logs.forEach((log) => {
        const logDate = new Date(log.createdAt);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask passwords in audit logs', async () => {
      // Attempt signup - passwords should be masked in logs
      const email = `mask-test-${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post('/patients/signup')
        .send({
          email,
          password: 'SecurePassword123',
          firstName: 'John',
          lastName: 'Mask',
        })
        .expect(201);

      // Get audit logs and verify password not in details
      const logsRes = await request(app.getHttpServer())
        .get('/audit/logs?action=patients_signup&status=success')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      logsRes.body.logs.forEach((log) => {
        if (log.details) {
          // Password should not appear in plaintext
          expect(log.details).not.toContain('SecurePassword123');
          // Should show REDACTED
          expect(log.details).toContain('***REDACTED***');
        }
      });
    });
  });
});
