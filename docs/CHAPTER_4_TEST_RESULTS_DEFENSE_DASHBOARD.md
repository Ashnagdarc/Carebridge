# 4.3 Test Results and Defense Dashboard

End-to-end testing was performed on the local CareBridge Docker environment to validate the complete consent-based data exchange workflow across the middleware, patient PWA, mock hospitals, PostgreSQL database, and defense dashboard. The test confirms that the middleware can create a consent request, approve consent, retrieve patient data from Hospital A, deliver the approved data to Hospital B, and record the workflow through audit logs.

The defense simulation was executed on 25 April 2026 using the following local services:

| Service | URL | Status |
|---|---:|---|
| Middleware API | `http://localhost:3000/api/v1` | PASS |
| Patient PWA | `http://localhost:3001` | PASS |
| Defense Dashboard | `http://localhost:3002` | PASS |
| Mock Hospital A | `http://localhost:4001` | PASS |
| Mock Hospital B | `http://localhost:4002` | PASS |
| PostgreSQL | `localhost:5432` | PASS |

## Defense Simulation Command

The following command was used to trigger the full defense demo flow:

```bash
curl -s -w "\nHTTP %{http_code} TIME %{time_total}s\n" \
  -X POST "http://localhost:3000/api/v1/defense/start?token=carebridge-defense-demo" \
  -H "Content-Type: application/json" \
  -d '{
    "patientRef": "PAT_DEMO_001",
    "forceConsent": true,
    "autoApprove": true,
    "dataTypes": ["allergies", "medications", "diagnoses"],
    "purpose": "Emergency referral and continuity of care (defense demo)"
  }'
```

## End-to-End Test Results

Live timing verification was executed on 25 April 2026 by capturing defense WebSocket events for request `cmoeg6cim003f10md19col06o` and measuring timestamp deltas between consecutive workflow events.

| Workflow Step | Latency | % of Total (3,793ms) | Status |
| --- | ---: | ---: | --- |
| `data_request_created` → `consent_request_created` | 65ms | 1.7% | ✅ |
| `consent_request_created` → `data_request_in_progress` | 1,269ms | 33.5% | ✅ |
| `data_request_in_progress` → `data_fetch_started` | 1ms | 0.0% | ✅ |
| `data_fetch_started` → `data_delivery_started` | 1,217ms | 32.1% | ✅ |
| `data_delivery_started` → `data_request_completed` | 1,241ms | 32.7% | ✅ |
| Total event-tracked workflow (`created` → `completed`) | 3,793ms | 100% | ✅ |

Additional runtime checks from the same verification window:

- `POST /api/v1/defense/start` returned `latencyMs` values of `2443ms` and `2435ms` across two successful runs.
- `GET /api/v1/defense/resolve-patient` responded in `24ms` (`HTTP 200 TIME 0.024336s`).

## Backend Test Coverage Evidence

Backend coverage was executed with:

```bash
npm --prefix packages/middleware run test:cov
```

Observed summary from the run:

| Metric | Result |
| --- | ---: |
| Statements | 19.31% |
| Branches | 26.96% |
| Functions | 20.24% |
| Lines | 19.57% |

Result status:

- ❌ `test:cov` failed (exit code `1`)
- ❌ Coverage did not meet `85%+`

Primary blockers reported by Jest/TypeScript during the coverage run:

- `consentRequestId` is referenced in `data-request.service.ts` and `defense.service.ts`, but does not exist on Prisma `DataRequest` types
- `passwordResetToken` is referenced in `patients.service.ts`, but does not exist on the current `PrismaService` client

Because these compile-time errors occur during coverage collection, the reported percentages are partial and not valid for an acceptance claim of `85%+`.

## Successful Middleware Response

The completed defense run returned the following key result:

```json
{
  "ok": true,
  "request": {
    "id": "cmoeg6n3x003t10mdrtr488s9",
    "patientId": "patient-001",
    "sourceHospitalId": "cmoe5svj5000714loj0a6kg0p",
    "targetHospitalId": "cmoe5svgg000614lo0nxfw6ca",
    "dataTypes": ["allergies", "medications", "diagnoses"],
    "purpose": "Emergency referral and continuity of care (defense demo)",
    "status": "completed",
    "failureReason": null,
    "consentId": "cmoeg6o36003z10mdx5ojqh4v",
    "latencyMs": 2435
  },
  "context": {
    "patientId": "patient-001",
    "autoApproved": true
  }
}
```

## Delivered Patient Data

Mock Hospital B confirmed that it received the approved patient data from Hospital A:

```json
{
  "deliveries": [
    {
      "id": "delivery-1",
      "patientId": "patient-001",
      "sourceHospital": "HOSPITAL_A",
      "dataTypes": ["allergies", "medications", "diagnoses"],
      "data": {
        "allergies": [
          {
            "substance": "Penicillin",
            "severity": "high",
            "reaction": "Anaphylaxis"
          },
          {
            "substance": "Latex",
            "severity": "moderate",
            "reaction": "Rash"
          }
        ],
        "medications": [
          {
            "name": "Metformin",
            "dosage": "500mg",
            "frequency": "twice daily"
          },
          {
            "name": "Lisinopril",
            "dosage": "10mg",
            "frequency": "daily"
          }
        ],
        "diagnoses": [
          {
            "code": "E11.9",
            "description": "Type 2 diabetes mellitus"
          },
          {
            "code": "I10",
            "description": "Essential hypertension"
          }
        ]
      }
    }
  ]
}
```

## Audit Log Evidence

The PostgreSQL audit log recorded the main workflow events:

| Audit Event | Status | Meaning |
|---|---:|---|
| `data_request_created_pending_consent` | success | Middleware blocked data exchange until patient consent was created. |
| `data_request_completed` | success | Middleware retrieved data from Hospital A and delivered it to Hospital B. |
| `v1_defense_resolve-patient` | success | Defense dashboard successfully resolved the patient reference. |

## Defense Dashboard Result

The defense dashboard visualizes the same workflow as a live sequence:

1. The patient reference `PAT_DEMO_001` is entered into the dashboard.
2. The middleware resolves the patient record.
3. A data request is created by Hospital B.
4. The middleware checks active consent and creates a pending consent request.
5. Consent is approved.
6. The middleware retrieves data from Mock Hospital A.
7. The middleware delivers the approved data to Mock Hospital B.
8. The dashboard receives live WebSocket events and displays the completed exchange.

## Summary

The simulated defense run passed successfully after the Docker demo hospital endpoints were configured to use internal service names. The completed workflow demonstrates that CareBridge supports consent-first patient data exchange, real-time defense dashboard monitoring, hospital-to-hospital routing, and database-backed audit logging.

## 4.6 Development Challenges and Resolutions

CareBridge development encountered practical implementation challenges common in distributed healthcare middleware systems. The items below are restricted to repository-verifiable evidence and live checks performed in this chapter.

### Challenge 1: Internal Service Routing in Dockerized Demo Flow

**Problem:** The defense flow depends on inter-container HTTP calls between middleware and mock hospitals, which fail if localhost-style endpoints are used inside containers.

**Resolution implemented:**

- `docker-compose.yml` sets middleware demo endpoints to internal service names:
  - `DEFENSE_HOSPITAL_A_ENDPOINT=http://mock-hospital-a:4001`
  - `DEFENSE_HOSPITAL_B_ENDPOINT=http://mock-hospital-b:4002`
- `DefenseService` consumes these endpoint environment variables when upserting demo hospitals.

**Verified outcome:** Defense flow completes successfully in live runs, and data delivery to Mock Hospital B is recorded in the returned response and audit logs.

### Challenge 2: Real-Time Event Ordering and Visibility

**Problem:** The defense dashboard requires a reliable event sequence (`data_request_created` through `data_request_completed`) to present a coherent process timeline.

**Resolution implemented:**

- Middleware emits explicit defense events from `DataRequestService` at each key workflow phase.
- `DefenseGateway` broadcasts structured events over `/ws/defense`.
- Defense dashboard subscribes to this stream and orders request events by timestamp before rendering stages.

**Verified outcome:** Live event capture for request `cmoeg6cim003f10md19col06o` showed a complete ordered chain from creation to completion.

### Challenge 3: Consent-Gated Data Exchange Behavior

**Problem:** Data must not be exchanged before patient consent is requested and approved.

**Resolution implemented:**

- On missing active consent, `DataRequestService` creates a consent request and keeps the data request pending.
- Audit action `data_request_created_pending_consent` is written before routing proceeds.
- On approval, processing continues to data fetch and delivery.

**Verified outcome:** Audit evidence in this chapter includes both pending-consent and completed-request actions, confirming consent-first behavior.

### Challenge 4: Migration and Schema Drift Control

**Problem:** Maintaining consistent schema evolution across environments is required for reproducible deployments.

**Resolution implemented:**

- Prisma migration workflows are documented (`migrate dev` for development, `migrate deploy` for deployment).
- Schema and migration SQL include explicit relational constraints (`@unique`, `ON DELETE CASCADE`, `ON DELETE SET NULL`) across core entities.

**Verified outcome:** Current schema/migration artifacts are consistent with constrained relational design for consent, request, and audit data.

### Challenge 5: Scripted Iteration Reliability (Ralph Loop)

**Problem:** Repeating build/test/verify cycles consistently across tasks can become error-prone when done manually.

**Resolution implemented:**

- `ralph-loop.sh` automates task-driven iteration flow (task lookup, checks, iteration boundaries, logging).
- Runtime logs are written to `.ralph-logs/` for traceability.

**Verified outcome:** Script and logging structure are present and wired to `TASKS.md` task parsing in the current repository.

### Verification Notes and Scope

- This section intentionally excludes non-instrumented metrics (for example, exact failure percentages, concurrent user counts, and fixed-latency guarantees) unless directly measured in this chapter.
- Performance values reported in Section 4.3 are based on live run output and WebSocket event timestamps captured during verification.

