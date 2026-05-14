// CareBridge: Mock destination hospital API used in integration and demo flows.
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 4002);
const expectedToken = process.env.MOCK_HOSPITAL_TOKEN || 'mock-hospital-token';
// In-memory store is intentional for demo/test determinism.
const deliveries = [];

app.use(express.json({ limit: '1mb' }));

function requireBearerToken(req, res, next) {
  // Mirror middleware's bearer requirement for integration realism.
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

function validateDeliveryPayload(payload) {
  // Minimal contract check; deeper schema validation belongs in middleware.
  const { patientId, sourceHospital, dataTypes, data } = payload || {};

  return Boolean(patientId && sourceHospital && Array.isArray(dataTypes) && data);
}

function createDelivery(payload) {
  // Delivery IDs are sequential to keep assertions predictable in tests.
  const delivery = {
    id: `delivery-${deliveries.length + 1}`,
    patientId: payload.patientId,
    sourceHospital: payload.sourceHospital,
    dataTypes: payload.dataTypes,
    data: payload.data,
    receivedAt: new Date().toISOString(),
  };

  deliveries.push(delivery);

  return delivery;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mock-hospital-b' });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'mock-hospital-b',
    status: 'ok',
    docs: {
      health: 'GET /health',
      deliveriesCreate: 'POST /api/v1/data-delivery',
      deliveriesList: 'GET /api/v1/data-delivery',
      auth: 'Authorization: Bearer mock-hospital-token',
    },
  });
});

app.post('/api/v1/data-delivery', requireBearerToken, (req, res) => {
  if (!validateDeliveryPayload(req.body)) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'patientId, sourceHospital, dataTypes, and data are required',
    });
  }

  const delivery = createDelivery(req.body);

  return res.status(202).json({
    status: 'accepted',
    deliveryId: delivery.id,
  });
});

app.get('/api/v1/data-delivery', requireBearerToken, (_req, res) => {
  res.json({ deliveries });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Mock Hospital B listening on http://localhost:${port}`);
  });
}

module.exports = app;
module.exports.isAuthorized = isAuthorized;
module.exports.validateDeliveryPayload = validateDeliveryPayload;
module.exports.createDelivery = createDelivery;
