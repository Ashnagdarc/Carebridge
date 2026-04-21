import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Data Request Routing (e2e)', () => {
  let app: INestApplication;
  let hospital1Token: string;
  let hospital2Token: string;
  let hospital1Id: string;
  let hospital2Id: string;
  let patientToken: string;
  let patientId: string;
  let consentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register two hospitals
    const hospital1Res = await request(app.getHttpServer())
      .post('/hospitals/register')
      .send({
        name: `Hospital 1 ${Date.now()}`,
        code: `HOSP1_${Date.now()}`,
        redirectUri: 'http://localhost:4001/callback',
        endpoint: 'http://localhost:3001/api',
      })
      .expect(201);

    hospital1Token = hospital1Res.body.accessToken;
    hospital1Id = hospital1Res.body.hospital.id;

    const hospital2Res = await request(app.getHttpServer())
      .post('/hospitals/register')
      .send({
        name: `Hospital 2 ${Date.now()}`,
        code: `HOSP2_${Date.now()}`,
        redirectUri: 'http://localhost:4002/callback',
        endpoint: 'http://localhost:3002/api',
      })
      .expect(201);

    hospital2Token = hospital2Res.body.accessToken;
    hospital2Id = hospital2Res.body.hospital.id;

    // Register a patient
    const patientRes = await request(app.getHttpServer())
      .post('/patients/signup')
      .send({
        email: `data-request-patient-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'DataRequest',
      })
      .expect(201);

    patientToken = patientRes.body.accessToken;
    patientId = patientRes.body.patient.id;

    // Create a consent request from hospital1 to patient
    const consentRes = await request(app.getHttpServer())
      .post('/consent/requests')
      .set('Authorization', `Bearer ${hospital1Token}`)
      .send({
        patientId,
        scopes: ['medications', 'allergies'],
      })
      .expect(201);

    const consentRequestId = consentRes.body.id;

    // Patient approves consent
    const approvalRes = await request(app.getHttpServer())
      .post(`/consent/requests/${consentRequestId}/approve`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        approvalCode: consentRes.body.approvalCode,
      })
      .expect(201);

    consentId = approvalRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /data-requests', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .send({
          patientId,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(401);
    });

    it('should reject invalid request body', async () => {
      const res = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          // missing targetHospitalId and dataTypes
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject if sourceHospitalId does not match token', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital2Id, // Mismatch
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(401);
    });

    it('should reject if patient not found', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId: 'nonexistent_patient',
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(400);
    });

    it('should reject if target hospital not found', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: 'nonexistent_hospital',
          dataTypes: ['medications'],
        })
        .expect(400);
    });

    it('should create data request with existing consent', async () => {
      const res = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications', 'allergies'],
          purpose: 'Patient transfer',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBeDefined();
      expect(res.body.patientId).toBe(patientId);
      expect(res.body.sourceHospitalId).toBe(hospital1Id);
      expect(res.body.targetHospitalId).toBe(hospital2Id);
      expect(res.body.dataTypes).toEqual(['medications', 'allergies']);
    });

    it('should create data request pending consent if no consent', async () => {
      const res = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital2Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital2Id,
          targetHospitalId: hospital1Id,
          dataTypes: ['medications'],
          purpose: 'Clinical review',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toMatch(/pending|in_progress/);
    });
  });

  describe('GET /data-requests/:id', () => {
    let dataRequestId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(201);

      dataRequestId = res.body.id;
    });

    it('should get data request by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/data-requests/${dataRequestId}`)
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.id).toBe(dataRequestId);
      expect(res.body.patientId).toBe(patientId);
    });

    it('should return 400 for nonexistent ID', async () => {
      await request(app.getHttpServer())
        .get('/data-requests/nonexistent_id')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/data-requests/${dataRequestId}`)
        .expect(401);
    });
  });

  describe('GET /data-requests', () => {
    it('should list data requests with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.requests).toBeDefined();
      expect(Array.isArray(res.body.requests)).toBe(true);
      expect(res.body.total).toBeDefined();
      expect(res.body.skip).toBeDefined();
      expect(res.body.take).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests?status=completed')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.requests).toBeDefined();
    });

    it('should support pagination parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests?skip=0&take=10')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.skip).toBe(0);
      expect(res.body.take).toBe(10);
    });

    it('should enforce max take limit', async () => {
      await request(app.getHttpServer())
        .get('/data-requests?take=1000')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(400);
    });
  });

  describe('GET /data-requests/hospital/outgoing', () => {
    it('should get hospital outgoing data requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests/hospital/outgoing')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.requests).toBeDefined();
      expect(Array.isArray(res.body.requests)).toBe(true);

      // All requests should be from hospital1
      res.body.requests.forEach((req: any) => {
        expect(req.sourceHospitalId).toBe(hospital1Id);
      });
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests/hospital/outgoing?skip=0&take=5')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.skip).toBe(0);
      expect(res.body.take).toBe(5);
    });
  });

  describe('GET /data-requests/hospital/incoming', () => {
    it('should get hospital incoming data requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests/hospital/incoming')
        .set('Authorization', `Bearer ${hospital2Token}`)
        .expect(200);

      expect(res.body.requests).toBeDefined();
      expect(Array.isArray(res.body.requests)).toBe(true);

      // All requests should target hospital2
      res.body.requests.forEach((req: any) => {
        expect(req.targetHospitalId).toBe(hospital2Id);
      });
    });
  });

  describe('GET /data-requests/hospital/stats', () => {
    it('should return data request statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests/hospital/stats')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.total).toBeDefined();
      expect(res.body.pending).toBeDefined();
      expect(res.body.completed).toBeDefined();
      expect(res.body.failed).toBeDefined();
      expect(res.body.timeout).toBeDefined();
      expect(res.body.successRate).toBeDefined();
      expect(res.body.averageLatencyMs).toBeDefined();

      expect(typeof res.body.total).toBe('number');
      expect(typeof res.body.successRate).toBe('number');
    });

    it('should have reasonable stats values', async () => {
      const res = await request(app.getHttpServer())
        .get('/data-requests/hospital/stats')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(res.body.successRate).toBeGreaterThanOrEqual(0);
      expect(res.body.successRate).toBeLessThanOrEqual(100);
      expect(res.body.pending).toBeGreaterThanOrEqual(0);
      expect(res.body.completed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authorization', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(401);
    });

    it('should reject patient tokens (hospital endpoint)', async () => {
      await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(401);
    });
  });

  describe('Data Request Lifecycle', () => {
    it('should track data request through states', async () => {
      // Create request
      const createRes = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(201);

      const requestId = createRes.body.id;
      expect(createRes.body.status).toBeDefined();

      // Get request to verify it was created
      const getRes = await request(app.getHttpServer())
        .get(`/data-requests/${requestId}`)
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      expect(getRes.body.id).toBe(requestId);
      expect(getRes.body.requestedAt).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data types gracefully', async () => {
      const res = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['invalid_type'],
        });

      // Should either create request or reject - both are valid
      expect([201, 400]).toContain(res.status);
    });

    it('should handle empty dataTypes array', async () => {
      const res = await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: [],
        })
        .expect(400);
    });
  });

  describe('Performance', () => {
    it('should create data request within reasonable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .send({
          patientId,
          sourceHospitalId: hospital1Id,
          targetHospitalId: hospital2Id,
          dataTypes: ['medications'],
        })
        .expect(201);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should list requests efficiently', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/data-requests')
        .set('Authorization', `Bearer ${hospital1Token}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
