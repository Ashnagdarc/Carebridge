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
      { substance: 'Peanuts', severity: 'high', reaction: 'Respiratory distress' },
      { substance: 'Shellfish', severity: 'moderate', reaction: 'Hives' },
    ],
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'daily' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'nightly' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'daily' },
      { name: 'Albuterol Inhaler', dosage: '90mcg', frequency: 'as needed' },
    ],
    diagnoses: [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus' },
      { code: 'I10', description: 'Essential hypertension' },
      { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
      { code: 'J45.909', description: 'Unspecified asthma, uncomplicated' },
    ],
    lab_results: [
      { name: 'HbA1c', value: '7.1', unit: '%', collectedAt: '2026-04-01' },
      { name: 'LDL Cholesterol', value: '132', unit: 'mg/dL', collectedAt: '2026-03-22' },
      { name: 'eGFR', value: '92', unit: 'mL/min/1.73m2', collectedAt: '2026-03-22' },
      { name: 'Fasting Glucose', value: '146', unit: 'mg/dL', collectedAt: '2026-03-22' },
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
  const record =
    sampleRecords[patientId] ||
    {
      allergies: [
        { substance: 'Unknown allergen', severity: 'low', reaction: 'Mild irritation' },
      ],
      medications: [
        { name: 'Follow-up medication', dosage: '10mg', frequency: 'daily' },
      ],
      diagnoses: [
        { code: 'Z00.00', description: 'General adult medical examination' },
      ],
      lab_results: [
        { name: 'CBC', value: 'normal', unit: '', collectedAt: '2026-04-01' },
      ],
    };

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

app.get('/', (_req, res) => {
  res.json({
    service: 'mock-hospital-a',
    status: 'ok',
    docs: {
      health: 'GET /health',
      patientData: 'GET /api/v1/patient-data/:patientId?dataTypes=allergies,medications',
      auth: 'Authorization: Bearer mock-hospital-token',
    },
  });
});

app.get('/api/v1/patient-data/:patientId', requireBearerToken, (req, res) => {
  const response = buildPatientDataResponse(
    req.params.patientId,
    req.query.dataTypes,
  );

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
