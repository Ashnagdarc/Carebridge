# CareBridge Architecture

CareBridge is a monorepo containing:

- **Middleware API** (`packages/middleware`): NestJS + Prisma + PostgreSQL; owns auth, consent, audit, routing orchestration.
- **Patient PWA** (`packages/patient-pwa`): Next.js app used by patients to manage consent and sessions.
- **Mock Hospitals** (`packages/mock-hospital-a`, `packages/mock-hospital-b`): local test doubles for downstream hospital integrations.

## Core Principles

- **Data minimization:** No clinical/PHI payloads are stored in the middleware DB; only consent metadata, routing metadata, and audit logs.
- **Zero-trust:** Every request is authenticated and authorized; sensitive flows are logged.
- **Audit-first:** All significant actions produce an audit record (who/what/when/result).

## Key Flows

### 1) Patient Authentication & Sessions

- Patient signs up / logs in via the middleware.
- Middleware issues access + refresh tokens and tracks sessions for revocation.

### 2) Consent Requests

- A hospital creates a consent request for a patient.
- The patient approves/denies/revokes consents via the PWA.

### 3) Data Requests & Routing

- Hospitals create a data request referencing the patient and requested scopes/data types.
- Middleware validates consent and routes the request between source/target hospitals, recording latency and outcomes.

### 4) Notifications (Optional)

- Middleware can notify patients via WebSocket and/or push notifications when enabled.

## Service Ports (Default)

- Middleware API: `http://localhost:3000/api/v1`
- Middleware Swagger UI: `http://localhost:3000/docs` (disabled by default in production unless `SWAGGER_ENABLED=true`)
- Patient PWA: `http://localhost:3001`
- Mock Hospital A: `http://localhost:4001`
- Mock Hospital B: `http://localhost:4002`

