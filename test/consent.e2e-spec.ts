import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Consent Management (e2e)', () => {
  let app: INestApplication;
  let hospitalToken: string;
  let patientToken: string;
  let patientId: string;
  let hospitalId: string;
  let consentRequestId: string;
  let approvalCode: string;

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
        name: `Hospital Consent Test ${Date.now()}`,
        code: `HOSP_CONSENT_${Date.now()}`,
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
        email: `consent-patient-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Consent',
      })
      .expect(201);

    patientToken = patientRes.body.accessToken;
    patientId = patientRes.body.patient.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /consent/requests', () => {
    it('should hospital create a consent request', async () => {
      const response = await request(app.getHttpServer())
        .post('/consent/requests')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({
          patientId,
          requestingHospitalId: hospitalId,
          dataType: 'allergies',
          description: 'Request for allergy information',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('pending');
      expect(response.body.dataType).toBe('allergies');
      expect(response.body.requestingHospital.id).toBe(hospitalId);

      consentRequestId = response.body.id;
      approvalCode = response.body.approvalCode || response.body.approvalCode; // Extract from response or generated
    });

    it('should reject consent request without hospital token', async () => {
      await request(app.getHttpServer())
        .post('/consent/requests')
        .send({
          patientId,
          requestingHospitalId: hospitalId,
          dataType: 'medications',
        })
        .expect(401);
    });

    it('should reject hospital creating request for another hospital', async () => {
      await request(app.getHttpServer())
        .post('/consent/requests')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({
          patientId,
          requestingHospitalId: 'different_hospital_id',
          dataType: 'allergies',
        })
        .expect(400);
    });
  });

  describe('GET /consent/requests/pending', () => {
    it('should list pending requests for patient', async () => {
      const response = await request(app.getHttpServer())
        .get('/consent/requests/pending')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.requests).toBeDefined();
      expect(Array.isArray(response.body.requests)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.requests[0].status).toBe('pending');
    });

    it('should reject list without patient token', async () => {
      await request(app.getHttpServer())
        .get('/consent/requests/pending')
        .expect(401);
    });
  });

  describe('POST /consent/requests/:id/approve', () => {
    it('should patient approve a consent request', async () => {
      // First get the approval code from the pending request
      const listRes = await request(app.getHttpServer())
        .get('/consent/requests/pending')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      const request_obj = listRes.body.requests.find((r) => r.id === consentRequestId);
      const code = request_obj?.approvalCode || 'TEST1234'; // Use a generated code

      const response = await request(app.getHttpServer())
        .post(`/consent/requests/${consentRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ approvalCode: code })
        .expect(200);

      expect(response.body.status).toBe('approved');
      expect(response.body.id).toBe(consentRequestId);
    });

    it('should reject approval with invalid code', async () => {
      const anotherRes = await request(app.getHttpServer())
        .post('/consent/requests')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({
          patientId,
          requestingHospitalId: hospitalId,
          dataType: 'medications',
        })
        .expect(201);

      const anotherRequestId = anotherRes.body.id;

      await request(app.getHttpServer())
        .post(`/consent/requests/${anotherRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ approvalCode: 'WRONGCODE' })
        .expect(401);
    });

    it('should reject approval without patient token', async () => {
      await request(app.getHttpServer())
        .post(`/consent/requests/${consentRequestId}/approve`)
        .send({ approvalCode: 'TEST1234' })
        .expect(401);
    });
  });

  describe('GET /consent/records', () => {
    it('should list active consents for patient', async () => {
      const response = await request(app.getHttpServer())
        .get('/consent/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.consents).toBeDefined();
      expect(Array.isArray(response.body.consents)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should reject list without patient token', async () => {
      await request(app.getHttpServer())
        .get('/consent/records')
        .expect(401);
    });
  });

  describe('POST /consent/requests/:id/deny', () => {
    it('should patient deny a consent request', async () => {
      // Create a new request to deny
      const newReqRes = await request(app.getHttpServer())
        .post('/consent/requests')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({
          patientId,
          requestingHospitalId: hospitalId,
          dataType: 'lab_results',
        })
        .expect(201);

      const newRequestId = newReqRes.body.id;

      const response = await request(app.getHttpServer())
        .post(`/consent/requests/${newRequestId}/deny`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Patient declined' })
        .expect(200);

      expect(response.body.status).toBe('denied');
      expect(response.body.id).toBe(newRequestId);
    });

    it('should reject deny without patient token', async () => {
      await request(app.getHttpServer())
        .post(`/consent/requests/${consentRequestId}/deny`)
        .send({})
        .expect(401);
    });
  });

  describe('Full Consent Lifecycle', () => {
    it('should complete full consent flow: request -> approve -> list -> revoke', async () => {
      // 1. Hospital requests consent
      const createRes = await request(app.getHttpServer())
        .post('/consent/requests')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({
          patientId,
          requestingHospitalId: hospitalId,
          dataType: 'diagnoses',
          description: 'Full lifecycle test',
        })
        .expect(201);

      const requestId = createRes.body.id;
      const code = createRes.body.approvalCode || 'TEST1234';

      // 2. Patient sees pending request
      const pendingRes = await request(app.getHttpServer())
        .get('/consent/requests/pending')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(pendingRes.body.requests.some((r) => r.id === requestId)).toBe(true);

      // 3. Patient approves
      const approveRes = await request(app.getHttpServer())
        .post(`/consent/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ approvalCode: code })
        .expect(200);

      expect(approveRes.body.status).toBe('approved');

      // 4. Patient lists active consents
      const activesRes = await request(app.getHttpServer())
        .get('/consent/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(activesRes.body.consents.length).toBeGreaterThan(0);

      // 5. Patient revokes consent (if record exists)
      const consentId = activesRes.body.consents[0]?.id;
      if (consentId) {
        const revokeRes = await request(app.getHttpServer())
          .delete(`/consent/records/${consentId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({})
          .expect(200);

        expect(revokeRes.body.revokedAt).toBeDefined();
      }
    });
  });

  describe('GET /consent/records/:patientId', () => {
    it('should hospital view patient consent records', async () => {
      const response = await request(app.getHttpServer())
        .get(`/consent/records/${patientId}`)
        .set('Authorization', `Bearer ${hospitalToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject without hospital token', async () => {
      await request(app.getHttpServer())
        .get(`/consent/records/${patientId}`)
        .expect(401);
    });
  });
});
