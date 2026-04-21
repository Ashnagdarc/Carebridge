# Task 1.4: Consent Service - Quick Reference

## Service Overview
Hospital → Requests Consent → Patient → Approves/Denies → Creates Consent Record

## Core Methods

```typescript
// Hospital initiates consent request
createConsentRequest(dto: CreateConsentRequestDto): Promise<ConsentRequestResponseDto>
// Returns: ConsentRequest with approval code + status: "pending"

// Patient approves with code
approveConsentRequest(id: string, dto: ApproveConsentRequestDto): Promise<ConsentRequestResponseDto>
// Verifies approvalCode, creates ConsentRecord, sets status: "approved"

// Patient denies request
denyConsentRequest(id: string, dto: DenyConsentRequestDto): Promise<ConsentRequestResponseDto>
// Sets status: "denied"

// Patient revokes active consent
revokeConsent(id: string, patientId: string, dto: RevokeConsentDto): Promise<ConsentRecordResponseDto>
// Sets revokedAt timestamp (soft delete)

// Patient views pending requests
listPendingConsentRequests(patientId: string)
// Returns: { requests: ConsentRequest[], total: number }

// Patient views active consents
listActiveConsents(patientId: string)
// Returns: { consents: ConsentRecord[], total: number }

// Hospital views patient's consents
getConsentRecordsForHospital(patientId: string, hospitalId: string)
// Returns: ConsentRecord[] (filtered by hospital)

// Check if consent exists and is valid
hasActiveConsent(patientId: string, hospitalId: string, dataType: string): Promise<boolean>

// Track data access for compliance
recordConsentAccess(id: string, hospitalId: string): Promise<ConsentRecordResponseDto>
// Increments accessCount + updates lastAccessedAt
```

## Status States Flow

```
pending → approved ✓ (with approvalCode verification)
       → denied ✗
       → expired ⏰ (auto-expire after 30 days)

approved → active (in ConsentRecord with revokedAt: null)
        → revoked (with revokedAt: timestamp)
```

## Endpoints Reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /consent/requests | Hospital | Hospital creates request |
| POST | /consent/requests/:id/approve | Patient | Patient approves (needs code) |
| POST | /consent/requests/:id/deny | Patient | Patient denies |
| DELETE | /consent/records/:id | Patient | Patient revokes |
| GET | /consent/requests/pending | Patient | List pending requests |
| GET | /consent/records | Patient | List active consents |
| GET | /consent/records/:patientId | Hospital | Hospital views consents |

## Key Fields

**ConsentRequest:**
- id, patientId, requestingHospitalId, dataType
- status: "pending" | "approved" | "denied" | "expired"
- approvalCode: 8-character random code for verification
- expiresAt: Default 30 days from creation
- approvedAt, rejectedAt: Timestamps

**ConsentRecord:**
- id, consentRequestId, patientId, requestingHospitalId, sourceHospitalId
- dataType, accessCount (incremented on each access)
- lastAccessedAt: Updated on each access
- revokedAt: Set on revocation (soft delete)
- expiresAt: Inherited from ConsentRequest

## Error Cases

| Error | Status | Cause |
|-------|--------|-------|
| Missing required fields | 400 | incomplete DTO |
| Patient not found | 400 | invalid patientId |
| Hospital not found | 400 | invalid hospitalId |
| Request not found | 404 | invalid consentRequestId |
| Already approved | 400 | changing approved request |
| Invalid approval code | 401 | wrong code provided |
| Unauthorized | 401 | wrong patient/hospital |
| Expired | 400 | past expiresAt date |

## Approval Code Verification

1. Server generates: `ABC123XY` (8-char random)
2. Returned to patient in response
3. Patient must include code in approve request body
4. Server verifies: `approvalCode === dto.approvalCode`
5. Security: Prevents token-based approval bypass

## Expiry Handling

- Default: 30 days from creation
- Custom: Pass `expiresAt` in create request
- Auto-expire: Service marks pending → expired after expiresAt
- Filter: Active consents exclude expired + revoked records

## Guards

```typescript
@UseGuards(HospitalJwtAuthGuard)  // Validates type: 'hospital'
@UseGuards(PatientJwtAuthGuard)   // Validates type: 'patient'
```

## Test Commands

```bash
npm run test -- consent.service.spec.ts    # 13 unit tests
npm run test:e2e -- consent.e2e-spec.ts    # 12+ integration tests
npm run test                                 # All tests (31 total)
```

## Database Schema (Key Tables)

- `ConsentRequest`: Hospital requests, patient approvals
- `ConsentRecord`: Active consents from approved requests
- Relationships: Both cascade on patient/hospital deletion
- Indexes: patientId, requestingHospitalId, status, createdAt

## Next Integration Points

- **Task 1.5**: Audit all consent operations
- **Task 1.6**: Use hasActiveConsent() to validate data access
- **Task 2.1-2.3**: Patient PWA displays pending + active consents

---

**Reference:** Task 1.4 (Core Consent Service)
**Status:** ✅ Complete (Iteration 1/3)
