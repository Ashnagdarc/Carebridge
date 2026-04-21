const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const app = require('./server');

describe('mock-hospital-b', () => {
  it('requires bearer authentication for delivery', async () => {
    const authorized = app.isAuthorized({ header: () => '' });
    assert.equal(authorized, false);
  });

  it('accepts delivered patient data', async () => {
    const payload = {
      patientId: 'patient-001',
      sourceHospital: 'HOSPITAL_A',
      dataTypes: ['allergies'],
      data: { allergies: [{ substance: 'Penicillin' }] },
    };
    const body = app.createDelivery(payload);

    assert.equal(app.validateDeliveryPayload(payload), true);
    assert.equal(body.patientId, 'patient-001');
    assert.ok(body.id);
  });
});
