const express = require('express');

const app = express();
const port = Number(process.env.PORT || 4001);
const expectedToken = process.env.MOCK_HOSPITAL_TOKEN || 'mock-hospital-token';

app.use(express.json());

function requireBearerToken(req, res, next) {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Valid bearer token required',
    });
  }

  return next();
}

function isAuthorized(req) {
  const authorization = req.header('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');

  return Boolean(token && token === expectedToken);
}

const sampleRecords = {
  'patient-001': {
    allergies: [
      { substance: 'Penicillin', severity: 'high', reaction: 'Anaphylaxis' },
      { substance: 'Latex', severity: 'moderate', reaction: 'Rash' },
    ],
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'daily' },
    ],
    diagnoses: [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus' },
      { code: 'I10', description: 'Essential hypertension' },
    ],
    lab_results: [
      { name: 'HbA1c', value: '7.1', unit: '%', collectedAt: '2026-04-01' },
    ],
  },
};

function pickDataTypes(record, dataTypes) {
  return dataTypes.reduce((selected, dataType) => {
    selected[dataType] = record[dataType] || [];
    return selected;
  }, {});
}

function buildPatientDataResponse(patientId, requestedDataTypes) {
  const record = sampleRecords[patientId];

  if (!record) {
    return null;
  }

  const requestedTypes = String(requestedDataTypes || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const dataTypes = requestedTypes.length ? requestedTypes : Object.keys(record);

  return {
    patientId,
    sourceHospital: 'HOSPITAL_A',
    dataTypes,
    data: pickDataTypes(record, dataTypes),
    retrievedAt: new Date().toISOString(),
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mock-hospital-a' });
});

app.get('/api/v1/patient-data/:patientId', requireBearerToken, (req, res) => {
  const response = buildPatientDataResponse(
    req.params.patientId,
    req.query.dataTypes,
  );

  if (!response) {
    return res.status(404).json({
      error: 'not_found',
      message: `Patient ${req.params.patientId} not found`,
    });
  }

  return res.json(response);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Mock Hospital A listening on http://localhost:${port}`);
  });
}

module.exports = app;
module.exports.isAuthorized = isAuthorized;
module.exports.buildPatientDataResponse = buildPatientDataResponse;
