// CareBridge: Test coverage for this module behavior.
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const app = require('./server');

describe('mock-hospital-a', () => {
  it('requires bearer authentication for patient data', async () => {
    const authorized = app.isAuthorized({ header: () => '' });
    assert.equal(authorized, false);
  });

  it('returns requested patient data scopes', async () => {
    const body = app.buildPatientDataResponse(
      'patient-001',
      'allergies,medications',
    );

    assert.deepEqual(body.dataTypes, ['allergies', 'medications']);
    assert.ok(Array.isArray(body.data.allergies));
    assert.ok(Array.isArray(body.data.medications));
  });
});
