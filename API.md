# CareBridge Middleware API Documentation

> **Status:** ✅ Source of truth is Swagger/OpenAPI  
> Last Updated: April 22, 2026

---

## 📖 Overview

The primary, up-to-date API documentation is generated from the middleware and available at:

- `http://localhost:3000/docs` (local/dev)

This file is a quick reference to major endpoints and auth patterns.

**Base URL (local):** `http://localhost:3000/api/v1`  
**Authentication:** Bearer tokens for patient and hospital endpoints  

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)

---

## Authentication

All authenticated endpoints use:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Health

- `GET /health`
- `GET /health/ready`

### Hospitals

- `POST /hospitals/register`
- `POST /hospitals/login`
- `GET /hospitals/profile` (auth)
- `GET /hospitals`

### Patients

- `POST /patients/signup`
- `POST /patients/login`
- `POST /patients/refresh`
- `POST /patients/logout` (auth)
- `GET /patients/profile` (auth)
- `PUT /patients/profile` (auth)
- `PUT /patients/password` (auth)
- `POST /patients/sessions/logout-all` (auth)
- `GET /patients/sessions` (auth)
- `DELETE /patients/sessions/:sessionId` (auth)
- `DELETE /patients/account` (auth)

### Consent

- `POST /consent/requests` (hospital auth)
- `POST /consent/requests/:id/approve` (patient auth)
- `POST /consent/requests/:id/deny` (patient auth)
- `GET /consent/requests/pending` (patient auth)
- `GET /consent/records` (patient auth)
- `DELETE /consent/records/:id` (patient auth)
- `GET /consent/records/:patientId` (hospital auth)

### Data Requests

- `POST /data-requests` (hospital auth)
- `GET /data-requests/:id` (hospital auth)
- `GET /data-requests` (hospital auth)
- `GET /data-requests/hospital/outgoing` (hospital auth)
- `GET /data-requests/hospital/incoming` (hospital auth)
- `GET /data-requests/hospital/stats` (hospital auth)

### Audit

- `GET /audit/logs` (hospital auth)
- `GET /audit/logs/:id` (hospital auth)
- `GET /audit/patient-logs` (patient auth)
- `GET /audit/hospital-logs` (hospital auth)
- `GET /audit/summary` (hospital auth)

### Notifications

- `POST /notifications/push/subscribe` (patient auth)
- `DELETE /notifications/push/unsubscribe` (patient auth)

#### Patient Token Refresh

```http
POST /auth/patients/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

## Common Response Format

All API responses follow a standard envelope format:

### Success Response

```json
{
  "status": "success",
  "code": 200,
  "data": {
    // Actual response data
  },
  "timestamp": "2026-04-20T14:30:00Z"
}
```

### Error Response

```json
{
  "status": "error",
  "code": 400,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      {
        "field": "email",
        "reason": "Required field missing"
      }
    ]
  },
  "timestamp": "2026-04-20T14:30:00Z"
}
```

---

## Error Handling

| HTTP Status | Error Type | Description | Example |
|-------------|-----------|-------------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request format or data | Missing required field |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication | Invalid JWT token |
| 403 | `FORBIDDEN` | Insufficient permissions | Patient accessing other patient's data |
| 404 | `NOT_FOUND` | Resource not found | Consent request ID doesn't exist |
| 409 | `CONFLICT` | Resource already exists | Email already registered |
| 429 | `RATE_LIMITED` | Too many requests | Exceeded rate limit |
| 500 | `INTERNAL_ERROR` | Server error | Database connection failed |

---

## Hospital Endpoints

### Hospital Registration

**Endpoint:** `POST /hospitals/register`  
**Auth:** None (public endpoint, should be restricted in production)  
**Rate Limit:** 1 per minute  

```http
POST /hospitals/register
Content-Type: application/json

{
  "name": "Primary Care Hospital",
  "contact_email": "admin@hospital-a.example.com",
  "api_url": "https://api.hospital-a.example.com/data"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "hospital-uuid-001",
    "external_id": "hospital_a_001",
    "name": "Primary Care Hospital",
    "client_id": "hosp_a_xyz123",
    "client_secret": "secret_xyz123_keep_safe",
    "created_at": "2026-04-20T10:00:00Z"
  }
}
```

⚠️ **Note:** `client_secret` is returned only once. Store securely.

### List Hospitals (Admin Only)

**Endpoint:** `GET /hospitals`  
**Auth:** Bearer JWT (admin token)  

```http
GET /hospitals?page=1&limit=20
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "hospitals": [
      {
        "id": "hospital-uuid-001",
        "name": "Primary Care Hospital",
        "external_id": "hospital_a_001",
        "is_active": true,
        "created_at": "2026-04-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

---

## Patient Endpoints

### Get Patient Profile

**Endpoint:** `GET /patients/me`  
**Auth:** Bearer JWT (patient token)  

```http
GET /patients/me
Authorization: Bearer {patient_token}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "patient-uuid-001",
    "uid": "JD-12345-6789",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-15",
    "qr_code": "https://carebridge.example.com/qr/JD-12345-6789.png",
    "created_at": "2026-04-15T09:00:00Z"
  }
}
```

### Update Patient Profile

**Endpoint:** `PATCH /patients/me`  
**Auth:** Bearer JWT (patient token)  

```http
PATCH /patients/me
Content-Type: application/json
Authorization: Bearer {patient_token}

{
  "first_name": "Jonathan",
  "phone_number": "+1-555-1234"
}
```

**Response (200 OK):** Updated patient object

### Generate QR Code

**Endpoint:** `GET /patients/me/qr-code`  
**Auth:** Bearer JWT (patient token)  

```http
GET /patients/me/qr-code?format=png&size=300
Authorization: Bearer {patient_token}
```

**Response:** PNG image (200 OK) or JSON:
```json
{
  "status": "success",
  "data": {
    "qr_code_url": "https://carebridge.example.com/qr/JD-12345-6789.png",
    "patient_uid": "JD-12345-6789",
    "expires_at": null
  }
}
```

---

## Consent Management

### Create Consent Request

**Endpoint:** `POST /consent-requests`  
**Auth:** Bearer JWT (hospital token)  
**Rate Limit:** 10 per minute per hospital  

```http
POST /consent-requests
Content-Type: application/json
Authorization: Bearer {hospital_token}

{
  "patient_uid": "JD-12345-6789",
  "source_hospital_id": "hospital-uuid-001",
  "requesting_hospital_id": "hospital-uuid-002",
  "scopes": ["allergies", "medications", "diagnoses"],
  "clinical_justification": "Pre-operative evaluation for cardiac procedure"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "consent-req-uuid-001",
    "patient_uid": "JD-12345-6789",
    "source_hospital": "Primary Care Hospital",
    "requesting_hospital": "Specialty Cardiac Clinic",
    "scopes": ["allergies", "medications", "diagnoses"],
    "clinical_justification": "Pre-operative evaluation for cardiac procedure",
    "status": "pending",
    "expires_at": "2026-04-22T14:30:00Z",
    "created_at": "2026-04-20T14:30:00Z"
  }
}
```

### List Pending Consent Requests (Patient)

**Endpoint:** `GET /patients/me/consent-requests/pending`  
**Auth:** Bearer JWT (patient token)  

```http
GET /patients/me/consent-requests/pending
Authorization: Bearer {patient_token}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "consent_requests": [
      {
        "id": "consent-req-uuid-001",
        "requesting_hospital": "Specialty Cardiac Clinic",
        "scopes": ["allergies", "medications"],
        "clinical_justification": "Pre-operative evaluation",
        "status": "pending",
        "expires_at": "2026-04-22T14:30:00Z",
        "created_at": "2026-04-20T14:30:00Z"
      }
    ]
  }
}
```

### Approve Consent Request

**Endpoint:** `POST /consent-requests/{id}/approve`  
**Auth:** Bearer JWT (patient token)  

```http
POST /consent-requests/consent-req-uuid-001/approve
Content-Type: application/json
Authorization: Bearer {patient_token}

{
  "expiry_days": 7,
  "patient_note": "Approved for cardiac evaluation"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "consent-req-uuid-001",
    "status": "approved",
    "approved_at": "2026-04-20T14:35:00Z",
    "expires_at": "2026-04-27T23:59:59Z",
    "consent_record_id": "consent-rec-uuid-001"
  }
}
```

### Deny Consent Request

**Endpoint:** `POST /consent-requests/{id}/deny`  
**Auth:** Bearer JWT (patient token)  

```http
POST /consent-requests/consent-req-uuid-001/deny
Content-Type: application/json
Authorization: Bearer {patient_token}

{
  "reason": "Not comfortable sharing at this time"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "consent-req-uuid-001",
    "status": "denied",
    "denied_at": "2026-04-20T14:35:00Z"
  }
}
```

### List Active Consents (Patient)

**Endpoint:** `GET /patients/me/consent-records`  
**Auth:** Bearer JWT (patient token)  

```http
GET /patients/me/consent-records?status=active
Authorization: Bearer {patient_token}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "consent_records": [
      {
        "id": "consent-rec-uuid-001",
        "requesting_hospital": "Specialty Cardiac Clinic",
        "scopes": ["allergies", "medications"],
        "status": "active",
        "granted_at": "2026-04-20T14:35:00Z",
        "expires_at": "2026-04-27T23:59:59Z"
      }
    ]
  }
}
```

### Revoke Consent

**Endpoint:** `DELETE /consent-records/{id}`  
**Auth:** Bearer JWT (patient token)  

```http
DELETE /consent-records/consent-rec-uuid-001
Authorization: Bearer {patient_token}
```

**Response (204 No Content)** or:
```json
{
  "status": "success",
  "data": {
    "id": "consent-rec-uuid-001",
    "status": "revoked",
    "revoked_at": "2026-04-20T14:40:00Z"
  }
}
```

---

## Data Requests & Routing

### Initiate Data Request

**Endpoint:** `POST /data-requests`  
**Auth:** Bearer JWT (hospital token)  
**Rate Limit:** 100 per hour per hospital  

```http
POST /data-requests
Content-Type: application/json
Authorization: Bearer {hospital_token}

{
  "patient_uid": "JD-12345-6789",
  "source_hospital_id": "hospital-uuid-001",
  "requesting_hospital_id": "hospital-uuid-002",
  "scopes": ["allergies", "medications"],
  "clinical_justification": "Pre-operative evaluation"
}
```

**Response (202 Accepted or 200 OK):**
```json
{
  "status": "success",
  "code": 202,
  "data": {
    "request_id": "data-req-uuid-001",
    "status": "pending_consent",
    "message": "Consent request sent to patient; awaiting approval",
    "consent_request_id": "consent-req-uuid-001"
  }
}
```

**Or, if consent already exists (200 OK):**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "request_id": "data-req-uuid-001",
    "status": "completed",
    "patient_data": {
      "allergies": [...],
      "medications": [...]
    },
    "retrieved_from": "Primary Care Hospital",
    "delivered_to": "Specialty Cardiac Clinic",
    "completed_at": "2026-04-20T14:40:00Z"
  }
}
```

---

## Audit Logs

### Query Audit Logs (Admin Only)

**Endpoint:** `GET /audit-logs`  
**Auth:** Bearer JWT (admin token)  

```http
GET /audit-logs?actor_type=hospital&action=data_delivered&start_date=2026-04-01&end_date=2026-04-30&page=1&limit=50
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `actor_type`: `hospital`, `patient`, `system`
- `action`: `request_sent`, `consent_approved`, `data_retrieved`, `data_delivered`, etc.
- `start_date`: ISO 8601 date (optional)
- `end_date`: ISO 8601 date (optional)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 500)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "audit_logs": [
      {
        "id": "audit-log-uuid-001",
        "actor_type": "hospital",
        "actor_id": "hospital-uuid-002",
        "action": "data_delivered",
        "resource_type": "consent_request",
        "resource_id": "consent-req-uuid-001",
        "data_scopes": ["allergies", "medications"],
        "status": "success",
        "created_at": "2026-04-20T14:40:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

---

## Rate Limiting & Pagination

### Rate Limiting

All endpoints are rate-limited. Check response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1713612000
```

**Exceeded Rate Limit (429 Too Many Requests):**
```json
{
  "status": "error",
  "code": 429,
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds",
    "retry_after": 60
  }
}
```

### Pagination

List endpoints support pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Paginated Response:**
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Code Examples

### JavaScript / Node.js (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.carebridge.example.com/api/v1'
});

// Hospital authentication
async function hospitalLogin(clientId, clientSecret) {
  const response = await api.post('/auth/hospitals/login', {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'data:read data:write'
  });
  return response.data.data.access_token;
}

// Patient signup
async function patientSignup(email, password, firstName, lastName) {
  const response = await api.post('/auth/patients/signup', {
    email,
    password,
    first_name: firstName,
    last_name: lastName
  });
  return response.data.data;
}

// Create consent request
async function createConsentRequest(token, patientUid, scopes) {
  const response = await api.post(
    '/consent-requests',
    {
      patient_uid: patientUid,
      source_hospital_id: 'hospital-uuid-001',
      requesting_hospital_id: 'hospital-uuid-002',
      scopes: scopes,
      clinical_justification: 'Patient care'
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data.data;
}
```

### cURL Examples

```bash
# Hospital login
curl -X POST https://api.carebridge.example.com/api/v1/auth/hospitals/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=hosp_id&client_secret=secret"

# Patient signup
curl -X POST https://api.carebridge.example.com/api/v1/auth/patients/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }'

# Get patient profile
curl -X GET https://api.carebridge.example.com/api/v1/patients/me \
  -H "Authorization: Bearer {patient_token}"
```

---

## Testing

### Postman Collection

*(To be provided)*

A complete Postman collection with pre-configured requests, auth flows, and test scripts is available in the `docs/postman/` directory.

### Integration Tests

Run integration tests to validate API endpoints:

```bash
npm run test:integration
```

---

## Support & Issues

- **API Issues:** Create an issue in GitHub
- **Documentation Updates:** Submit a PR with improvements
- **Security Vulnerabilities:** Report privately to security@carebridge.example.com

---

**Document Version:** 1.0 (Template)  
**Last Updated:** April 20, 2026  
**Status:** Template – To be updated during development
