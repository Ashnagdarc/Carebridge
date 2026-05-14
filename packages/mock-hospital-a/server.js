// CareBridge: Mock source hospital API used in integration and demo flows.
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 4001);
const expectedToken = process.env.MOCK_HOSPITAL_TOKEN || 'mock-hospital-token';

app.use(express.json());

function requireBearerToken(req, res, next) {
  // Keep auth surface minimal: every clinical-data endpoint shares this guard.
  if (!isAuthorized(req)) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Valid bearer token required',
    });
  }

  return next();
}

function isAuthorized(req) {
  // Allow case-insensitive "Bearer" and strip only the prefix.
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
    blood_tests: [
      { name: 'CA 19-9 Pancreatic Cancer Marker', value: '89.00', unit: 'U/mL', reference_range: '< 37.00', status: 'High', collectedAt: '2026-04-02', sample_type: 'Serum (2 ml)', tat: '2 hrs' },
      { name: 'Complete Blood Count (CBC)', value: 'Normal', unit: '', collectedAt: '2026-04-10', results: 'WBC: 7.2 K/uL | RBC: 4.8 M/uL | Hemoglobin: 14.2 g/dL | Hematocrit: 42.5%' },
      { name: 'Comprehensive Metabolic Panel (CMP)', value: 'Normal', unit: '', collectedAt: '2026-04-10', results: 'Sodium: 138 mEq/L | Potassium: 4.2 mEq/L | Creatinine: 0.9 mg/dL | BUN: 18 mg/dL' },
      { name: 'Lipid Panel', value: 'Abnormal', unit: '', collectedAt: '2026-04-10', results: 'Total Cholesterol: 232 mg/dL | HDL: 38 mg/dL | LDL: 152 mg/dL | Triglycerides: 165 mg/dL' },
      { name: 'Thyroid Function Tests (TSH)', value: '2.1', unit: 'mIU/L', reference_range: '0.4 - 4.0', status: 'Normal', collectedAt: '2026-04-05' },
      { name: 'Liver Function Tests (LFT)', value: 'Normal', unit: '', collectedAt: '2026-04-10', results: 'AST: 28 U/L | ALT: 32 U/L | Bilirubin: 0.7 mg/dL | ALP: 72 U/L' },
    ],
    blood_group: [
      { type: 'O', rh_factor: 'Positive', collectedAt: '2026-03-15' },
    ],
    health_history: [
      { date: '2026-04-10', note: 'Regular checkup - BP 138/88, Weight 89kg, all vitals stable. Patient advised to increase physical activity.' },
      { date: '2026-03-28', note: 'Follow-up for hypertension management - medication adjusted. Next visit in 3 months.' },
      { date: '2026-03-15', note: 'Annual physical examination completed. Routine vaccinations up to date. Blood group confirmed O+.' },
    ],
  },
};

function pickDataTypes(record, dataTypes) {
  // Preserve response shape by returning an empty list for unknown data types.
  return dataTypes.reduce((selected, dataType) => {
    selected[dataType] = record[dataType] || [];
    return selected;
  }, {});
}

function generateRealisticPatientData(patientId) {
  // Deterministic but unique data based on patient ID
  const hash = patientId.charCodeAt(0) + patientId.charCodeAt(patientId.length - 1);
  const seed = Math.abs(hash) % 10;
  
  const allergies = [
    [
      { substance: 'Penicillin', severity: 'high', reaction: 'Anaphylaxis' },
      { substance: 'Sulfonamides', severity: 'moderate', reaction: 'Rash' },
    ],
    [
      { substance: 'Aspirin', severity: 'moderate', reaction: 'GI upset' },
      { substance: 'NSAIDs', severity: 'moderate', reaction: 'Stomach pain' },
    ],
    [
      { substance: 'Latex', severity: 'moderate', reaction: 'Contact dermatitis' },
      { substance: 'Nickel', severity: 'low', reaction: 'Itching' },
    ],
    [
      { substance: 'Shellfish', severity: 'high', reaction: 'Angioedema' },
    ],
    [
      { substance: 'Peanuts', severity: 'high', reaction: 'Anaphylaxis' },
      { substance: 'Tree nuts', severity: 'moderate', reaction: 'Throat swelling' },
    ],
  ];

  const medications = [
    [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'daily', indication: 'Hypertension' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'nightly', indication: 'High cholesterol' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'daily', indication: 'Cardiovascular protection' },
    ],
    [
      { name: 'Metformin', dosage: '500mg', frequency: 'twice daily', indication: 'Type 2 diabetes' },
      { name: 'Glipizide', dosage: '5mg', frequency: 'daily', indication: 'Diabetes management' },
    ],
    [
      { name: 'Albuterol Inhaler', dosage: '90mcg', frequency: 'as needed', indication: 'Asthma' },
      { name: 'Fluticasone', dosage: '110mcg', frequency: 'twice daily', indication: 'Asthma maintenance' },
    ],
    [
      { name: 'Omeprazole', dosage: '20mg', frequency: 'daily', indication: 'GERD' },
      { name: 'Famotidine', dosage: '20mg', frequency: 'twice daily', indication: 'Acid reflux' },
    ],
    [
      { name: 'Levothyroxine', dosage: '75mcg', frequency: 'daily', indication: 'Hypothyroidism' },
    ],
  ];

  const bloodTests = [
    [
      { name: 'Complete Blood Count (CBC)', value: 'Normal', unit: '', collectedAt: '2026-04-10', results: 'WBC: 7.2 K/uL | RBC: 4.8 M/uL | Hemoglobin: 14.2 g/dL | Hematocrit: 42.5%' },
      { name: 'Comprehensive Metabolic Panel (CMP)', value: 'Normal', unit: '', collectedAt: '2026-04-10', results: 'Sodium: 138 mEq/L | Potassium: 4.2 mEq/L | Creatinine: 0.9 mg/dL | BUN: 18 mg/dL' },
    ],
    [
      { name: 'Complete Blood Count (CBC)', value: 'Abnormal', unit: '', collectedAt: '2026-04-09', results: 'WBC: 12.5 K/uL | RBC: 4.2 M/uL | Hemoglobin: 11.8 g/dL | Hematocrit: 38.2%' },
      { name: 'Liver Function Tests', value: 'Abnormal', unit: '', collectedAt: '2026-04-09', results: 'ALT: 52 U/L | AST: 48 U/L | Bilirubin: 1.2 mg/dL' },
    ],
    [
      { name: 'Lipid Panel', value: 'Abnormal', unit: '', collectedAt: '2026-04-08', results: 'Total Cholesterol: 260 mg/dL | HDL: 35 mg/dL | LDL: 180 mg/dL | Triglycerides: 210 mg/dL' },
      { name: 'Fasting Glucose Test', value: 'High', unit: '', collectedAt: '2026-04-08', results: 'Fasting Glucose: 168 mg/dL' },
    ],
    [
      { name: 'Thyroid Panel', value: 'Normal', unit: '', collectedAt: '2026-04-07', results: 'TSH: 2.1 mIU/L | T4: 8.5 mcg/dL' },
      { name: 'Complete Urinalysis', value: 'Normal', unit: '', collectedAt: '2026-04-07', results: 'Appearance: Clear | Color: Yellow | Protein: Negative | Glucose: Negative' },
    ],
    [
      { name: 'Coagulation Panel', value: 'Normal', unit: '', collectedAt: '2026-04-06', results: 'PT: 12.5 sec | PTT: 28.3 sec | INR: 0.98' },
      { name: 'Kidney Function Panel', value: 'Normal', unit: '', collectedAt: '2026-04-06', results: 'Creatinine: 0.85 mg/dL | BUN: 16 mg/dL | eGFR: 98 mL/min' },
    ],
  ];

  const bloodGroups = [
    [{ type: 'O', rh_factor: 'Positive', collectedAt: '2026-03-15' }],
    [{ type: 'A', rh_factor: 'Positive', collectedAt: '2026-03-14' }],
    [{ type: 'B', rh_factor: 'Negative', collectedAt: '2026-03-13' }],
    [{ type: 'AB', rh_factor: 'Positive', collectedAt: '2026-03-12' }],
    [{ type: 'O', rh_factor: 'Negative', collectedAt: '2026-03-11' }],
  ];

  const healthHistories = [
    [
      { date: '2026-04-10', note: 'Regular checkup - BP 138/88, Weight 89kg, all vitals stable. Patient counseled on weight loss and exercise.' },
      { date: '2026-03-28', note: 'Follow-up for hypertension - BP controlled on current medication. Lipid panel ordered.' },
      { date: '2026-03-15', note: 'Annual physical - vaccinations up to date. Referral sent to cardiologist for preventive assessment.' },
    ],
    [
      { date: '2026-04-09', note: 'Emergency visit - elevated temperature 39.2°C, sore throat, cough. Diagnosed with acute bronchitis. Prescribed antibiotics.' },
      { date: '2026-03-20', note: 'Follow-up visit - recovering well from respiratory infection. Chest X-ray normal.' },
      { date: '2026-02-15', note: 'Preventive care visit - discussed seasonal allergies and flu vaccination.' },
    ],
    [
      { date: '2026-04-08', note: 'Diabetes management review - HbA1c 7.8%, glucose monitoring logs reviewed. Medication adjusted.' },
      { date: '2026-03-01', note: 'Nutritionist consultation - dietary counseling for diabetes. Home glucose monitor provided.' },
      { date: '2026-02-20', note: 'Routine diabetes screening - retinopathy screening completed, results normal.' },
    ],
    [
      { date: '2026-04-05', note: 'Post-surgical follow-up - incision healing well, no signs of infection. Sutures removed.' },
      { date: '2026-03-22', note: 'Orthopedic consultation - diagnosed with rotator cuff syndrome, physical therapy recommended.' },
      { date: '2026-03-10', note: 'Pre-operative assessment - cleared for elective shoulder procedure.' },
    ],
    [
      { date: '2026-04-03', note: 'Mental health assessment - annual psychiatric evaluation, patient stable on current antidepressants.' },
      { date: '2026-03-15', note: 'Therapy session notes - discussed stress management and sleep hygiene.' },
      { date: '2026-02-20', note: 'Medication review - current regimen well tolerated, no side effects reported.' },
    ],
  ];

  return {
    allergies: allergies[seed % allergies.length],
    medications: medications[seed % medications.length],
    blood_tests: bloodTests[seed % bloodTests.length],
    blood_group: bloodGroups[seed % bloodGroups.length],
    health_history: healthHistories[seed % healthHistories.length],
    diagnoses: [
      { code: 'I10', description: 'Essential hypertension' },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus' },
    ],
    lab_results: [
      { name: 'HbA1c', value: '7.1', unit: '%', collectedAt: '2026-04-01' },
      { name: 'Creatinine', value: '0.9', unit: 'mg/dL', collectedAt: '2026-03-22' },
    ],
  };
}

function buildPatientDataResponse(patientId, requestedDataTypes) {
  // Known demo patient gets a fixed record; others are generated deterministically.
  const record = sampleRecords[patientId] || generateRealisticPatientData(patientId);

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
