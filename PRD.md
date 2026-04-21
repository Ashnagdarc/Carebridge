# CareBridge Middleware - Product Requirements Document

## 1. Introduction

**Product Name:** CareBridge Middleware

**Overview:**
CareBridge Middleware is a secure, consent-based patient data exchange platform that enables regulated and auditable sharing of health information between hospital systems. The middleware acts as a trusted intermediary, ensuring patient privacy, regulatory compliance, and seamless interoperability between healthcare organizations.

**Primary Users:**
- **Hospital Systems (Data Sources & Consumers):** Healthcare facilities that either provide patient data or request patient records from partner hospitals. Both Hospital A and Hospital B operate as dual-role actors—each can be a data source or consumer depending on the clinical scenario.
- **Patients (Consent Providers):** Individual patients who maintain control over their health information through explicit consent grants and revocations. Patients engage with the system via a mobile-optimized patient-facing application.

**Core Value Proposition:**
- **Privacy-First:** Patients explicitly grant or deny access to their health records.
- **Compliance-Ready:** Audit trails document every access and consent decision, supporting HIPAA, GDPR, and similar regulatory requirements.
- **Hospital-Centric:** Medical data remains on hospital systems; the middleware manages only consent, routing, and audit records.
- **Interoperability:** Standards-based APIs enable seamless integration with diverse Electronic Health Record (EHR) systems.

---

## 2. Use Case Overview

### Typical Data Exchange Flow

**Scenario:** Hospital B requires a patient's records from Hospital A to provide specialized care.

#### Key Actors:
1. **Hospital A** – Data source; hosts patient medical records
2. **Hospital B** – Data consumer; requests records for clinical purposes
3. **Patient** – Consent provider; authorizes or denies the data share
4. **CareBridge Middleware** – Orchestrator; manages consent, validates requests, and enables secure data routing

#### Step-by-Step Process:

1. **Request Initiation**
   - Hospital B initiates a data request through the middleware API, specifying the patient UID, data scopes (e.g., allergies, medications, diagnoses), and clinical justification.
   - Request is time-stamped and logged in the audit system.

2. **Middleware Validation**
   - CareBridge verifies Hospital B's credentials and authorization.
   - Middleware checks if the patient has existing active consent for Hospital B or if a new consent request is necessary.

3. **Consent Request to Patient**
   - If no active consent exists, the middleware sends a consent request notification to the patient via the PWA.
   - Patient receives details: which hospital (Hospital B), what data scopes are being requested, and the clinical purpose.

4. **Patient Decision**
   - Patient logs into the PWA using their secure credentials.
   - Patient reviews the consent request and decides to approve or deny.
   - Patient may set an expiration date for the consent (e.g., 30 days, 1 year, indefinite).

5. **Consent Recording**
   - The patient's decision is recorded in the middleware database with a time-stamp and audit trail.
   - If approved, consent status is updated and the middleware proceeds; if denied, the request is terminated.

6. **Data Retrieval & Routing** *(if approved)*
   - Middleware contacts Hospital A via secure API to retrieve the requested data.
   - Hospital A verifies the consent record and returns the authorized information.
   - Data is never stored by CareBridge; it flows directly from Hospital A to Hospital B.

7. **Response to Hospital B**
   - Authorized data is transmitted to Hospital B's system via encrypted channel.
   - Hospital B receives data and acknowledgment of consent.

8. **Audit Logging**
   - All events are logged: request creation, consent request sent, patient decision, data retrieved, data delivered.
   - Logs include actor (Hospital A/B, Patient, System), action, timestamp, data scope, and outcome.

#### Actors Table:

| Actor | Role | Key Responsibilities |
|-------|------|----------------------|
| Hospital A | Data Source | Hosts medical records; responds to authorized data requests |
| Hospital B | Data Consumer | Initiates requests; receives authorized data |
| Patient | Consent Provider | Reviews requests; grants or denies consent; manages consent settings |
| CareBridge Middleware | Orchestrator | Validates requests; manages consent; routes data; maintains audit trail |

---

## 3. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CareBridge Middleware                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          API Gateway & Authentication Layer (OAuth2/JWT)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │   Core Services                                              │  │
│  │  ├─ Consent Service (manage consent lifecycle)              │  │
│  │  ├─ Request Router (route data requests & responses)        │  │
│  │  ├─ Audit Service (log all events)                          │  │
│  │  └─ Notification Service (alert patients of requests)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │        PostgreSQL Database                                  │  │
│  │  ├─ Patients (UID, QR code, metadata)                      │  │
│  │  ├─ Consent Requests & Records                             │  │
│  │  ├─ Audit Logs (access history)                            │  │
│  │  └─ Hospital Mappings (data source links)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         ▲                                          ▲
         │                                          │
         │ Secure HTTPS/TLS                        │ Secure HTTPS/TLS
         │                                          │
┌────────┴──────────┐                    ┌─────────┴──────────┐
│   Hospital A      │                    │   Hospital B       │
│   EHR System      │                    │   EHR System       │
│                   │                    │                    │
│ ┌───────────────┐ │                    │ ┌───────────────┐  │
│ │ Patient Data  │ │                    │ │ Patient Data  │  │
│ │ Database      │ │                    │ │ Database      │  │
│ └───────────────┘ │                    │ └───────────────┘  │
└───────────────────┘                    └────────────────────┘
         (Data Source)                         (Data Consumer)
         
         
┌─────────────────────────────────────────────────────────────────────┐
│                    Patient-Facing PWA                               │
│          (Next.js React App – Mobile & Web Browser)                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Features:                                                   │  │
│  │  • Secure Login (OAuth2/Email + Password)                   │  │
│  │  • Patient Identity View (UID & QR Code Display)            │  │
│  │  • Consent Request Inbox (notifications & requests)         │  │
│  │  • Approve/Deny Interface (with expiration settings)        │  │
│  │  • Consent History & Audit View (past decisions & access)   │  │
│  │  • Settings & Preferences                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Design: Apple HIG compliant, minimalist black-and-white,          │
│          SF Symbols, focus on clarity and simplicity               │
└─────────────────────────────────────────────────────────────────────┘
         ▲
         │ Secure WebSocket & HTTPS
         │
    ┌────┴─────┐
    │  Patient  │
    └───────────┘
```

### Architecture Principles:

1. **Separation of Concerns:** Middleware manages consent and orchestration; hospitals retain medical data.
2. **Zero-Trust Security:** Every request is authenticated, authorized, and audited.
3. **Data Minimization:** Medical data never stored in middleware; only metadata and consent records.
4. **Scalability:** Microservices-ready architecture supports horizontal scaling of services.
5. **Audit-First:** Every interaction is logged for compliance and forensics.

---

## 4. Middleware Tech Stack

### Backend Infrastructure:

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Runtime** | Node.js (v18+) | Asynchronous I/O; large ecosystem; fast development |
| **Framework** | NestJS *or* Express | NestJS for enterprise-grade structure; Express for simplicity |
| **Database** | PostgreSQL 14+ | Robust ACID compliance; excellent for audit logging; JSONB support |
| **ORM/Query Builder** | Prisma | Type-safe; auto-migrations; excellent PostgreSQL integration |
| **Authentication** | OAuth2 / JWT | Standard healthcare integration pattern; RFC 6749 compliant |
| **Encryption** | TLS 1.3 (HTTPS) | Transport security; AES-256-GCM for sensitive data at-rest |
| **Logging** | Winston *or* Pino | Structured logging for compliance; fast, minimal overhead |
| **Testing** | Jest + Supertest | Comprehensive unit & integration testing |
| **API Documentation** | Swagger/OpenAPI 3.0 | Auto-generated, interactive API docs |
| **Container** | Docker | Standardized deployment; environment consistency |
| **Orchestration** | Kubernetes *or* Docker Compose | Production scalability; staging simplicity |

### Security Patterns:

1. **OAuth2 Flow:**
   - Hospitals authenticate via client credentials grant (server-to-server).
   - Patients authenticate via authorization code flow or device flow.

2. **JWT Tokens:**
   - Hospital tokens include role (Hospital A, Hospital B), scopes, and expiration.
   - Patient tokens include patient UID, session ID, and expiration.
   - All tokens signed with RS256 (asymmetric) for verification by multiple services.

3. **HTTPS/TLS:**
   - All communication encrypted; TLS certificate pinning for mobile PWA.
   - Perfect forward secrecy enabled; TLS 1.3 minimum.

4. **Database Security:**
   - Credentials never stored in plaintext; bcrypt + salt for patient passwords.
   - Sensitive fields encrypted at-rest using column-level encryption.
   - Row-level security policies enforce data isolation.

5. **Rate Limiting:**
   - API endpoints rate-limited to prevent abuse (e.g., 100 requests/min per hospital).

6. **CORS Policy:**
   - Strict CORS configuration; PWA origin whitelisted.

### Database Role:

The PostgreSQL database stores **only**:
- Patient identifiers (UID, QR code hash)
- Consent records (status, scopes, expiry, timestamps)
- Audit logs (actor, action, timestamp, result)
- Hospital mappings and configurations
- Session tokens and refresh tokens

**Medical data is never stored in the middleware database.**

---

## 5. Patient PWA Tech Stack

### Frontend Framework & Tools:

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Framework** | Next.js 14+ (React 19) | Server-side rendering; optimized for PWA; built-in API routes |
| **Language** | TypeScript | Type safety; IDE support; easier refactoring and maintenance |
| **Styling** | Tailwind CSS | Utility-first; minimal CSS; consistency with black-and-white theme |
| **State Management** | React Context *or* Zustand | Lightweight; suitable for patient-centric app |
| **HTTP Client** | TanStack Query (React Query) | Server state sync; caching; retry logic |
| **Authentication** | next-auth.js | OAuth2 integration; session management; type-safe |
| **PWA Setup** | next-pwa | Service Worker; offline support; install prompts |
| **Icons** | SF Symbols (via web font) *or* Heroicons | Native iOS feel; minimalist aesthetic |
| **Notifications** | Web Push API | Real-time consent request notifications |
| **QR Code Generation** | qrcode.react | Display patient UID as QR code |
| **Responsive Design** | Mobile-first CSS + next/image | Optimized for iPhone, iPad, Android |

### Design Adherence to Apple HIG:

- **Minimalist Layout:** Single-column layout; ample padding and white space.
- **Black & White Palette:** Primary text in black (#000000), backgrounds in white (#FFFFFF), minimal use of gray (#F5F5F5) for secondary elements.
- **Typography:** SF Pro Display for headings, SF Pro Text for body text (or system fonts via `font-family: -apple-system, BlinkMacSystemFont`).
- **Icons:** SF Symbols (e.g., checkmark, xmark, bell, lock) for intuitive visual hierarchy.
- **Interactions:** Haptic feedback on iOS; smooth transitions; clear call-to-action buttons.
- **Accessibility:** WCAG 2.1 AA compliance; sufficient color contrast; keyboard navigation support.

---

## 6. Data Model & Schema

### Core Tables:

#### **Patients Table**
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(50) UNIQUE NOT NULL,        -- Human-readable patient identifier
  qr_code_hash VARCHAR(255) UNIQUE,       -- Hash of QR code for verification
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,    -- bcrypt hash
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  hospital_a_id VARCHAR(100),             -- External ID in Hospital A's system
  hospital_b_id VARCHAR(100),             -- External ID in Hospital B's system
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL               -- Soft delete
);

CREATE INDEX idx_patients_uid ON patients(uid);
CREATE INDEX idx_patients_email ON patients(email);
```

#### **Consent Requests Table**
```sql
CREATE TABLE consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  requesting_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  source_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  status VARCHAR(50) NOT NULL,            -- 'pending', 'approved', 'denied', 'revoked'
  scopes TEXT[] NOT NULL,                 -- Array of data types: {'allergies', 'medications', 'diagnoses'}
  clinical_justification TEXT,
  expiry_date TIMESTAMP,                  -- When consent expires
  patient_decision_timestamp TIMESTAMP NULL,
  patient_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_requests_patient_id ON consent_requests(patient_id);
CREATE INDEX idx_consent_requests_status ON consent_requests(status);
CREATE INDEX idx_consent_requests_expiry_date ON consent_requests(expiry_date);
```

#### **Consent Records Table** (Historical/Active Consents)
```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  requesting_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  source_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  scopes TEXT[] NOT NULL,
  status VARCHAR(50) NOT NULL,            -- 'active', 'expired', 'revoked'
  granted_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_records_patient_id ON consent_records(patient_id);
CREATE INDEX idx_consent_records_status ON consent_records(status);
```

#### **Audit Logs Table**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(50) NOT NULL,        -- 'hospital', 'patient', 'system'
  actor_id VARCHAR(255) NOT NULL,         -- Hospital ID or Patient UID
  action VARCHAR(100) NOT NULL,           -- 'request_sent', 'consent_approved', 'data_retrieved', 'data_delivered'
  resource_type VARCHAR(50),              -- 'consent_request', 'data_fetch', 'patient'
  resource_id UUID,
  data_scopes TEXT[],                     -- What data was accessed
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50),                     -- 'success', 'failure'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### **Hospitals Table** (Partner Hospital Metadata)
```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  external_id VARCHAR(100) UNIQUE,        -- Hospital's internal system ID
  api_url TEXT NOT NULL,                  -- Endpoint for data requests
  api_key_hash VARCHAR(255),              -- Hashed API credentials
  contact_email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hospitals_external_id ON hospitals(external_id);
```

#### **Hospital Mappings Table** (Patient ID Cross-References)
```sql
CREATE TABLE hospital_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  hospital_patient_id VARCHAR(100) NOT NULL,  -- Patient ID in hospital's system
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(patient_id, hospital_id)
);

CREATE INDEX idx_hospital_mappings_patient_id ON hospital_mappings(patient_id);
CREATE INDEX idx_hospital_mappings_hospital_id ON hospital_mappings(hospital_id);
```

#### **Sessions Table** (Patient Sessions)
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  refresh_token_hash VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

---

## 7. Example Flow: Demo Scenario

### Scenario: Hospital B Requests Patient Allergy Records from Hospital A

**Setup:**
- **Patient:** John Doe (UID: `JD-12345-6789`, email: john@example.com)
- **Hospital A:** Primary Care Hospital (has John's full medical history)
- **Hospital B:** Specialty Cardiac Clinic (needs John's allergy info before cardiac procedure)

### Step-by-Step Walkthrough:

#### **Step 1: Hospital B Initiates Request**
```
POST /api/v1/data-requests
Host: carebridge-middleware.example.com
Authorization: Bearer {Hospital_B_JWT_Token}
Content-Type: application/json

{
  "patient_uid": "JD-12345-6789",
  "source_hospital_id": "hospital-a-uuid",
  "requesting_hospital_id": "hospital-b-uuid",
  "scopes": ["allergies", "adverse_reactions"],
  "clinical_justification": "Pre-operative evaluation for cardiac procedure on 2026-04-25",
  "consent_required": true
}
```

**Middleware Action:**
- Validates Hospital B's credentials and authorization.
- Checks if John already has active consent for Hospital B (assume none exists).
- Creates a new consent request record.
- Initiates patient notification.

#### **Step 2: Patient Receives Notification**
```
Middleware sends notification to PWA:
{
  "consent_request_id": "req-uuid-001",
  "from_hospital": "Specialty Cardiac Clinic",
  "data_requested": ["allergies", "adverse_reactions"],
  "reason": "Pre-operative evaluation for cardiac procedure",
  "expires_in": "48 hours"
}
```

**Patient Receives:**
- Push notification on mobile: "Specialty Cardiac Clinic is requesting access to your allergy information."
- Patient logs into PWA and sees consent inbox with the request.

#### **Step 3: Patient Reviews & Approves**
```
Patient opens PWA:
1. Sees login screen → enters email & password → authenticates
2. Navigates to "Consent Inbox" tab
3. Views request:
   - Hospital: Specialty Cardiac Clinic
   - Requested Data: Allergies & Adverse Reactions
   - Clinical Reason: Pre-operative evaluation for cardiac procedure
   - Request Valid Until: 2026-04-22
4. Taps "APPROVE" button
5. Sets consent expiration: "7 days" (will expire 2026-04-27)
6. Confirms: "Yes, allow Specialty Cardiac Clinic access"
```

**Middleware Records:**
```
INSERT INTO consent_records (
  patient_id, requesting_hospital_id, source_hospital_id,
  scopes, status, granted_at, expires_at
) VALUES (
  'patient-uuid', 'hospital-b-uuid', 'hospital-a-uuid',
  '{allergies, adverse_reactions}', 'active',
  '2026-04-20 14:30:00', '2026-04-27 23:59:59'
);

INSERT INTO audit_logs (
  actor_type, actor_id, action, resource_type, resource_id,
  data_scopes, status, created_at
) VALUES (
  'patient', 'JD-12345-6789', 'consent_approved',
  'consent_request', 'req-uuid-001',
  '{allergies, adverse_reactions}', 'success',
  CURRENT_TIMESTAMP
);
```

#### **Step 4: Middleware Checks Consent & Retrieves Data**
```
Middleware checks consent:
- Consent status: ACTIVE ✓
- Scopes requested: ['allergies', 'adverse_reactions']
- Consent valid until: 2026-04-27 ✓

Middleware calls Hospital A API:
POST /api/v1/patient-data
Host: hospital-a-api.example.com
Authorization: Bearer {CareBridge_JWT_Token}
Content-Type: application/json

{
  "patient_hospital_id": "HA-JD-98765",
  "scopes": ["allergies", "adverse_reactions"],
  "consent_token": "consent-record-uuid",
  "middleware_signature": "{digital_signature}"
}
```

**Hospital A Response:**
```json
{
  "status": "success",
  "data": {
    "patient_id": "HA-JD-98765",
    "allergies": [
      {
        "allergen": "Penicillin",
        "reaction": "Anaphylaxis",
        "severity": "severe"
      },
      {
        "allergen": "Latex",
        "reaction": "Contact Dermatitis",
        "severity": "mild"
      }
    ],
    "adverse_reactions": [
      {
        "medication": "Aspirin",
        "reaction": "GI upset",
        "severity": "mild"
      }
    ]
  },
  "retrieved_at": "2026-04-20T14:35:00Z"
}
```

#### **Step 5: Middleware Routes Data to Hospital B**
```
Middleware calls Hospital B API:
POST /api/v1/data-delivery
Host: hospital-b-api.example.com
Authorization: Bearer {CareBridge_JWT_Token}

{
  "request_id": "req-uuid-001",
  "patient_hospital_id": "HB-JD-12345",
  "data": { ... allergy data ... },
  "consent_record_id": "consent-record-uuid",
  "delivery_timestamp": "2026-04-20T14:36:00Z"
}
```

**Hospital B Receives:**
- Allergy information integrated into John's medical record in their EHR system.

#### **Step 6: Audit Trail Logged**
```
INSERT INTO audit_logs VALUES (
  'audit-log-uuid', 'hospital', 'hospital-b-uuid', 'data_delivered',
  'consent_request', 'req-uuid-001', '{allergies, adverse_reactions}',
  NULL, NULL, 'success', NULL, '2026-04-20T14:36:00Z'
);

INSERT INTO audit_logs VALUES (
  'audit-log-uuid-2', 'hospital', 'hospital-a-uuid', 'data_retrieved',
  'consent_request', 'req-uuid-001', '{allergies, adverse_reactions}',
  NULL, NULL, 'success', NULL, '2026-04-20T14:35:00Z'
);
```

#### **Step 7: Patient Views Consent History in PWA**
```
Patient navigates to "Consent History" tab:

Active Consents:
┌─────────────────────────────────────────────┐
│ Specialty Cardiac Clinic                    │
│ Approved on: April 20, 2026                 │
│ Data: Allergies, Adverse Reactions          │
│ Expires: April 27, 2026                     │
│ Status: ACTIVE ✓                            │
│ [REVOKE ANYTIME]                            │
└─────────────────────────────────────────────┘

Recent Access:
April 20, 2026, 2:36 PM
Data sent to Specialty Cardiac Clinic
Allergies & Adverse Reactions
```

**Patient Insight:**
- John does **not** see the actual allergy data in the PWA.
- John only sees that consent was granted and when it will expire.
- John can revoke consent at any time; revocation is audited immediately.

---

## 8. UI/UX Style Guide

### Design Philosophy:
The patient PWA follows **Apple's Human Interface Guidelines (HIG)** to deliver a minimalist, trustworthy experience that prioritizes clarity, simplicity, and patient control.

### Visual Style:

#### **Color Palette:**
- **Primary:** Black (#000000)
- **Background:** White (#FFFFFF)
- **Secondary:** Light Gray (#F5F5F5) for secondary elements, borders, dividers
- **Accent (Minimal):** Dark Gray (#333333) for subtle emphasis
- **Status Indicators:** Green (#34C759) for "Approved", Red (#FF3B30) for "Denied/Revoked"
- **No decorative colors:** Avoid blues, purples, or gradients; maintain black-and-white theme.

#### **Typography:**
- **Headline Font:** SF Pro Display (or system default: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- **Body Font:** SF Pro Text (or system default)
- **Sizes:**
  - Headline 1 (page title): 32pt, weight 700
  - Headline 2 (section title): 24pt, weight 600
  - Body (standard text): 16pt, weight 400
  - Small (helper text): 13pt, weight 400
  - Caption (metadata): 12pt, weight 400

#### **Icons:**
- Use **SF Symbols** exclusively (e.g., `checkmark.circle.fill`, `xmark.circle.fill`, `bell.fill`, `lock.fill`, `key.fill`, `eye.fill`, `clock.fill`).
- All icons monochrome black on white or inverse.
- Icon size: 24pt (standard), 32pt (large buttons).

#### **Spacing & Layout:**
- **Margins:** 16pt horizontal padding (left/right); 20pt top/bottom for sections.
- **Padding:** 12pt internal element padding; 16pt between content sections.
- **Line Height:** 1.5x font size for readability.
- **White Space:** Generous; minimize visual clutter; one primary action per screen.

### Screen Layouts:

#### **1. Login Screen**
```
┌─────────────────────────┐
│                         │  (White background)
│      🔒                 │  (Lock SF Symbol, 48pt)
│   CareBridge            │  (Headline 1, centered)
│   Patient Portal        │  (Caption, centered)
│                         │
│  ┌───────────────────┐  │
│  │ Email Address     │  │  (Input field, black border)
│  │ john@example.com  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Password          │  │  (Input field, masked)
│  │ ••••••••          │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   SIGN IN         │  │  (CTA button, black background, white text)
│  └───────────────────┘  │
│                         │
│  Don't have an account? │  (Link text, 13pt)
│  [ Create Account ]     │
│                         │
└─────────────────────────┘
```

#### **2. Home / Dashboard Screen**
```
┌─────────────────────────┐
│ CareBridge          👤  │  (Header: title + profile button)
├─────────────────────────┤
│                         │
│  Your Patient ID        │  (Headline 2, 20pt)
│  ────────────────       │
│                         │
│  ┌───────────────────┐  │
│  │   JD-12345-6789   │  │  (UID, monospace font, centered)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │  (QR Code SVG, 200px × 200px)
│  │  [QR CODE IMAGE]  │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Tap to copy UID or     │  (Helper text, 12pt)
│  share QR code          │
│                         │
├─────────────────────────┤
│                         │
│  You have 1 pending     │  (Notification badge)
│  consent request        │
│                         │
│  [ View Requests ] →    │  (CTA, arrow SF Symbol)
│                         │
└─────────────────────────┘
```

#### **3. Consent Inbox Screen**
```
┌─────────────────────────┐
│ Consent Requests   ✓ ✗  │  (Header: title + filter buttons)
├─────────────────────────┤
│                         │
│  PENDING (1)            │  (Section header, 13pt)
│  ────────────────       │
│                         │
│  ┌───────────────────┐  │
│  │ Specialty Cardiac │  │  (Card, light gray background)
│  │ Clinic            │  │
│  │                   │  │
│  │ Allergies,        │  │  (Data types)
│  │ Medications       │  │
│  │                   │  │
│  │ Pre-operative     │  │  (Reason, 13pt)
│  │ evaluation        │  │
│  │                   │  │
│  │ Expires: Apr 22   │  │  (Expiry, 12pt, light gray)
│  │                   │  │
│  │ [APPROVE]         │  │  (Green button, SF Symbol: checkmark)
│  │ [DENY]            │  │  (Red button, SF Symbol: xmark)
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│ APPROVED (3)            │  (Collapsed section, expandable)
│ Tap to expand →         │
│                         │
└─────────────────────────┘
```

#### **4. Consent Approval Screen**
```
┌─────────────────────────┐
│ ← Review Request        │  (Back button + header)
├─────────────────────────┤
│                         │
│  Allow access to your   │  (Headline 1, 28pt)
│  health information?    │
│                         │
│  ┌───────────────────┐  │
│  │ 🏥 Specialty      │  │  (Hospital info card)
│  │    Cardiac Clinic │  │
│  │                   │  │
│  │ Requesting:       │  │
│  │ • Allergies       │  │  (Bullet list)
│  │ • Medications     │  │
│  │ • Lab Results     │  │
│  │                   │  │
│  │ Reason:           │  │
│  │ Pre-operative     │  │
│  │ cardiac evaluation│  │
│  └───────────────────┘  │
│                         │
│  Consent Valid For:     │  (Option selector)
│  ┌─────────────────┐    │
│  │ ▼ 7 Days        │    │  (Dropdown)
│  └─────────────────┘    │
│  (Other: 30 days, 1 yr) │
│                         │
│  ┌───────────────────┐  │
│  │  APPROVE          │  │  (CTA button, green)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  DENY             │  │  (Secondary button, red)
│  └───────────────────┘  │
│                         │
│  I understand that      │  (Legal text, 12pt, light gray)
│  Specialty Cardiac      │
│  Clinic can access my   │
│  selected information   │
│  until the expiration.  │
│                         │
└─────────────────────────┘
```

#### **5. Consent History Screen**
```
┌─────────────────────────┐
│ Consent History         │  (Header)
├─────────────────────────┤
│                         │
│  ACTIVE (2)             │  (Section, 13pt bold)
│  ────────────────       │
│                         │
│  ┌───────────────────┐  │
│  │ Primary Care      │  │
│  │ Hospital          │  │
│  │ ✓ ACTIVE          │  │  (Green status indicator)
│  │                   │  │
│  │ Allergies,        │  │
│  │ Medications,      │  │
│  │ Diagnoses         │  │
│  │                   │  │
│  │ Granted:          │  │  (Metadata, 12pt)
│  │ Apr 10, 2026      │  │
│  │ Expires:          │  │
│  │ Apr 10, 2027      │  │
│  │                   │  │
│  │ [REVOKE]          │  │  (Action button)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Specialty Cardiac │  │
│  │ Clinic            │  │
│  │ ✓ ACTIVE          │  │
│  │ ... (similar card)│  │
│  └───────────────────┘  │
│                         │
│  EXPIRED (1)            │  (Collapsed section)
│  Tap to expand →        │
│                         │
│  REVOKED (0)            │  (Collapsed section)
│  Tap to expand →        │
│                         │
│  ACCESS LOG             │  (Divider)
│  ────────────────       │
│                         │
│  Apr 20, 2:36 PM        │  (Timeline entry, 12pt)
│  Data sent to Specialty │
│  Cardiac Clinic         │
│  Allergies              │
│                         │
│  Apr 15, 10:15 AM       │  (Previous entry)
│  Data accessed by       │
│  Primary Care Hospital  │
│  Full Profile           │
│                         │
└─────────────────────────┘
```

#### **6. Settings / Profile Screen**
```
┌─────────────────────────┐
│ Settings                │  (Header)
├─────────────────────────┤
│                         │
│  ACCOUNT                │  (Section header, 13pt bold)
│  ────────────────       │
│                         │
│  John Doe               │  (Name, body text)
│  john@example.com       │  (Email, 13pt)
│  DOB: 01/15/1990        │  (DOB, 13pt)
│                         │
│  [ CHANGE PASSWORD ]    │  (Button)
│  [ UPDATE PROFILE ]     │  (Button)
│                         │
├─────────────────────────┤
│                         │
│  NOTIFICATIONS          │  (Section header)
│  ────────────────       │
│                         │
│  🔔 New Requests        │  (Toggle switch, enabled)
│                         │
│  🔔 Access Logs         │  (Toggle switch, enabled)
│                         │
│  🔔 Expiry Reminders    │  (Toggle switch, enabled)
│                         │
├─────────────────────────┤
│                         │
│  SECURITY               │  (Section header)
│  ────────────────       │
│                         │
│  Active Sessions: 1     │  (Info, 13pt)
│                         │
│  [ VIEW SESSIONS ]      │  (Button)
│  [ SIGN OUT ALL ]       │  (Button, red text)
│                         │
├─────────────────────────┤
│                         │
│  [ SIGN OUT ]           │  (Primary action, black button)
│                         │
│  [ DELETE ACCOUNT ]     │  (Destructive action, red text)
│                         │
│  CareBridge v1.0.0      │  (Footer, 12pt, light gray)
│                         │
└─────────────────────────┘
```

### Interaction Patterns:

1. **Buttons:**
   - Primary CTA: Black background, white text, rounded corners (4pt).
   - Secondary CTA: White background, black border (1pt), black text.
   - Destructive CTA: Red text or red background.
   - Always include SF Symbol before or after text for clarity.

2. **Forms:**
   - One input per line; labels above inputs; clear error messages below.
   - Focus state: Black border (2pt); no color change.
   - Placeholder text: Light gray (#CCCCCC); no placeholder hints inside inputs.

3. **Cards:**
   - Light gray background (#F5F5F5); rounded corners (8pt); 1pt black border on hover.
   - Shadow (subtle): Offset 0px 2px, blur 4px, opacity 10%.

4. **Navigation:**
   - Bottom tab bar or top navigation; labels + icons (SF Symbols).
   - Active tab: Black icon; inactive: Light gray.
   - Maximum 4 tabs; avoid hamburger menus if possible.

5. **Feedback:**
   - Success: Green badge with checkmark SF Symbol.
   - Error: Red badge with exclamation SF Symbol; descriptive message.
   - Loading: Spinner (SF Symbol `hourglass`) with "Loading..." text.
   - Toast notifications: Slide in from top; auto-dismiss after 3 seconds.

### Accessibility:

- **Color Contrast:** All text meets WCAG AA (7:1 for large text, 4.5:1 for small text).
- **Touch Targets:** Minimum 44pt × 44pt for interactive elements.
- **Keyboard Navigation:** All features accessible via keyboard (Tab, Enter, Arrow keys).
- **Screen Reader:** All buttons, links, and form inputs have descriptive labels.
- **Reduced Motion:** Respect `prefers-reduced-motion` system setting; disable animations if enabled.

---

## 9. Ralph Loop Integration

### Ralph Loop Overview:

The Ralph Loop is an iterative development methodology where:
1. **Task Definition** – AI agent identifies or receives a task.
2. **Execution** – Agent implements the task.
3. **Verification** – Agent tests and validates the result.
4. **Iteration** – If issues found, agent loops back to refine; otherwise, task is complete.

This enables continuous, self-improving development cycles suitable for AI-assisted coding.

### Application to CareBridge:

#### **Phase 1: Task Definition (TASKS.md)**
All development work is tracked in a `TASKS.md` file that lists:
- **Feature/Task Name**
- **Acceptance Criteria** (What success looks like)
- **Status** (Not Started, In Progress, Testing, Complete, Blocked)
- **Assigned To** (Human or AI Agent)
- **Dependencies** (Blocking tasks)
- **Ralph Loop Iterations** (How many passes completed)

Example TASKS.md structure:
```markdown
# CareBridge Development Tasks

## Milestone 1: Backend API Setup (Week 1-2)

### Task 1.1: Set up NestJS project and database
- [ ] Status: In Progress
- Acceptance Criteria:
  - [ ] NestJS project initialized with TypeScript
  - [ ] PostgreSQL connection via Prisma configured
  - [ ] Docker Compose setup for local dev
  - [ ] All tests passing
- Iterations: 2/3
- Dependencies: None

### Task 1.2: Implement authentication (OAuth2/JWT)
- [ ] Status: Not Started
- Acceptance Criteria:
  - [ ] Hospital OAuth2 flow working
  - [ ] Patient JWT generation and validation
  - [ ] Token refresh mechanism
  - [ ] Unit tests (>90% coverage)
- Dependencies: Task 1.1
- Ralph Loop Iterations: 0/3

## Milestone 2: Patient PWA (Week 3-4)

### Task 2.1: Bootstrap Next.js PWA
- [ ] Status: Not Started
- Acceptance Criteria:
  - [ ] Next.js 14 project with TypeScript
  - [ ] PWA manifest and service worker configured
  - [ ] Mobile-responsive layout (iOS/Android tested)
  - [ ] Apple HIG compliance verified
- Dependencies: Task 1.2 (need API ready for integration)
```

#### **Phase 2: Ralph Loop Script**
Create a `ralph-loop.sh` script to automate iterations:

```bash
#!/bin/bash

# Ralph Loop - Iterative Development Automation
# Usage: ./ralph-loop.sh <task_id> <max_iterations>

TASK_ID=${1:-"1.1"}
MAX_ITERATIONS=${2:-3}
ITERATION=0

echo "🔄 Starting Ralph Loop for Task: $TASK_ID"
echo "Max Iterations: $MAX_ITERATIONS"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📍 Iteration $ITERATION / $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Step 1: Read task from TASKS.md
  echo "📋 Reading task definition..."
  # (Parse TASKS.md for task details)

  # Step 2: Execute (Run AI agent or developer)
  echo "⚙️  Executing task implementation..."
  # (Run build, tests, lint)
  npm run build
  npm run test
  npm run lint

  # Step 3: Verify
  echo "✅ Verifying acceptance criteria..."
  TEST_RESULT=$?

  if [ $TEST_RESULT -eq 0 ]; then
    echo "✓ All tests passed! Task complete."
    echo "✅ Task $TASK_ID marked as COMPLETE"
    exit 0
  else
    echo "❌ Tests failed. Iterating..."
    echo ""
    # Loop continues for next iteration
  fi

  echo ""
done

echo "⚠️  Max iterations reached. Task may require human review."
exit 1
```

#### **Phase 3: AI Agent Integration**
The Ralph Loop enables AI agents (like Claude or Copilot) to:
1. Read the task definition from `TASKS.md`.
2. Implement the feature or fix.
3. Run tests and validation.
4. If failed, update `TASKS.md` with blockers and request clarification or iterate.
5. If passed, mark task as complete and move to next.

**Example AI Workflow:**
```
AI Agent: "I read Task 2.1 from TASKS.md. Initializing Next.js PWA..."
[AI runs: npx create-next-app@latest carebridge-pwa --typescript]
[AI configures Tailwind CSS, next-pwa, TypeScript]
[AI runs: npm run build → PASS]
[AI runs: npm run test → 12 tests pass]
[AI updates TASKS.md: Task 2.1 → Status: COMPLETE, Iterations: 1/3]
AI Agent: "✅ Task 2.1 complete. Ready for next task."
```

---

## 10. File Structure Outline

```
carebridge-middleware/
├── README.md                          # Project overview, quick-start guide
├── PRD.md                             # This document (Product Requirements)
├── TASKS.md                           # Development tasks and progress tracking
├── ralph-loop.sh                      # Ralph Loop automation script
├── API.md                             # API documentation (Swagger/OpenAPI reference)
├── LICENSE                            # Open source or proprietary license
│
├── backend/
│   ├── package.json                   # NestJS dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── .env.example                   # Environment variable template
│   ├── docker-compose.yml             # Local PostgreSQL + Middleware setup
│   │
│   ├── src/
│   │   ├── main.ts                    # Application entry point
│   │   ├── app.module.ts              # Root NestJS module
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts        # OAuth2/JWT logic
│   │   │   ├── auth.controller.ts     # Login, token refresh endpoints
│   │   │   ├── jwt.strategy.ts        # JWT validation strategy
│   │   │   └── oauth2.strategy.ts     # Hospital OAuth2 logic
│   │   │
│   │   ├── consent/
│   │   │   ├── consent.module.ts
│   │   │   ├── consent.service.ts     # Consent business logic
│   │   │   ├── consent.controller.ts  # Consent request/approval endpoints
│   │   │   ├── consent.entity.ts      # Consent data models
│   │   │   └── consent.repository.ts  # Database queries
│   │   │
│   │   ├── patients/
│   │   │   ├── patients.module.ts
│   │   │   ├── patients.service.ts    # Patient profile management
│   │   │   ├── patients.controller.ts
│   │   │   ├── patients.entity.ts
│   │   │   └── patients.repository.ts
│   │   │
│   │   ├── hospitals/
│   │   │   ├── hospitals.module.ts
│   │   │   ├── hospitals.service.ts   # Hospital partner management
│   │   │   ├── hospitals.controller.ts
│   │   │   └── hospitals.repository.ts
│   │   │
│   │   ├── data-requests/
│   │   │   ├── data-requests.module.ts
│   │   │   ├── data-requests.service.ts  # Route requests to hospitals
│   │   │   ├── data-requests.controller.ts
│   │   │   └── data-requests.repository.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.service.ts       # Logging all events
│   │   │   ├── audit.interceptor.ts   # Auto-log HTTP requests
│   │   │   └── audit.repository.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts  # Email, push notifications
│   │   │   └── websocket.gateway.ts      # Real-time updates to PWA
│   │   │
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts       # Role-based access control
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   └── logging.interceptor.ts
│   │   │   ├── decorators/
│   │   │   │   ├── user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   └── dto/
│   │   │       ├── pagination.dto.ts
│   │   │       └── api-response.dto.ts
│   │   │
│   │   └── config/
│   │       ├── database.config.ts     # Prisma configuration
│   │       └── security.config.ts     # TLS, CORS, rate limiting
│   │
│   ├── prisma/
│   │   ├── schema.prisma              # Prisma schema definition
│   │   ├── seed.ts                    # Seed database with test data
│   │   └── migrations/                # Database migration files
│   │       ├── 001_init_schema.sql
│   │       └── 002_add_audit_logs.sql
│   │
│   ├── test/
│   │   ├── auth.spec.ts               # Authentication tests
│   │   ├── consent.spec.ts            # Consent workflow tests
│   │   ├── data-requests.spec.ts      # Data request routing tests
│   │   └── integration.spec.ts        # End-to-end integration tests
│   │
│   └── dist/                          # Compiled JavaScript output (gitignored)
│
├── frontend/
│   ├── package.json                   # Next.js dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.ts                 # Next.js configuration
│   ├── tailwind.config.ts             # Tailwind CSS configuration
│   ├── .env.example                   # Environment variable template
│   │
│   ├── public/
│   │   ├── manifest.json              # PWA manifest
│   │   ├── sw.js                      # Service Worker (simplified)
│   │   ├── icons/
│   │   │   ├── icon-192x192.png       # PWA icon
│   │   │   ├── icon-512x512.png
│   │   │   └── favicon.ico
│   │   └── sf-symbols.woff2           # SF Symbols font (if not using system font)
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout (Apple HIG styles)
│   │   │   ├── page.tsx               # Home / redirect to login/dashboard
│   │   │   ├── globals.css            # Global Tailwind styles
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx        # Login screen
│   │   │   │   └── signup/
│   │   │   │       └── page.tsx        # Signup screen
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx           # Home / dashboard (UID + QR display)
│   │   │   │   └── layout.tsx         # Dashboard layout with navigation
│   │   │   │
│   │   │   ├── consent/
│   │   │   │   ├── inbox/
│   │   │   │   │   └── page.tsx       # Consent request inbox
│   │   │   │   ├── request/
│   │   │   │   │   └── [id]/page.tsx  # Consent approval detail view
│   │   │   │   └── history/
│   │   │   │       └── page.tsx       # Consent history & access log
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx           # Settings / profile
│   │   │       └── sessions/
│   │   │           └── page.tsx       # Active sessions
│   │   │
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx      # Login form component
│   │   │   │   └── ProtectedRoute.tsx # Route guard for authenticated pages
│   │   │   │
│   │   │   ├── consent/
│   │   │   │   ├── ConsentCard.tsx    # Reusable consent request card
│   │   │   │   ├── ApprovalFlow.tsx   # Approval decision UI
│   │   │   │   └── AccessLog.tsx      # Timeline of access events
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── Header.tsx         # Top navigation / header
│   │   │   │   ├── TabNavigation.tsx  # Bottom tab bar
│   │   │   │   ├── Button.tsx         # Reusable button component (black/white)
│   │   │   │   ├── Card.tsx           # Reusable card component
│   │   │   │   ├── Modal.tsx          # Modal dialog component
│   │   │   │   └── Toast.tsx          # Toast notification component
│   │   │   │
│   │   │   └── qr/
│   │   │       └── QRCodeDisplay.tsx  # QR code display component
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts             # Authentication hook
│   │   │   ├── useConsent.ts          # Consent-related API calls
│   │   │   ├── useNotifications.ts    # WebSocket for real-time notifications
│   │   │   └── useLocalStorage.ts     # Client-side storage
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios HTTP client configuration
│   │   │   ├── auth.service.ts        # Authentication API calls
│   │   │   ├── consent.service.ts     # Consent API calls
│   │   │   └── websocket.service.ts   # WebSocket client
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts               # TypeScript interfaces and types
│   │   │   ├── auth.ts
│   │   │   ├── consent.ts
│   │   │   └── user.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── auth.ts                # Auth utilities (token management)
│   │   │   ├── formatters.ts          # Date, text formatting
│   │   │   └── validators.ts          # Input validation
│   │   │
│   │   └── utils/
│   │       ├── cn.ts                  # Tailwind class merging utility
│   │       └── constants.ts           # App constants, API URLs
│   │
│   ├── test/
│   │   ├── pages/
│   │   │   └── auth.spec.tsx          # Login page tests
│   │   ├── components/
│   │   │   └── ConsentCard.spec.tsx
│   │   └── hooks/
│   │       └── useAuth.spec.ts
│   │
│   └── .next/                         # Next.js build output (gitignored)
│
├── docs/
│   ├── ARCHITECTURE.md                # Detailed architecture documentation
│   ├── DEPLOYMENT.md                  # Deployment guide (Docker, Kubernetes)
│   ├── SECURITY.md                    # Security best practices, threat model
│   ├── COMPLIANCE.md                  # HIPAA, GDPR compliance notes
│   ├── TESTING.md                     # Testing strategy and coverage targets
│   ├── DATABASE.md                    # Schema migration guide
│   └── TROUBLESHOOTING.md             # Common issues and solutions
│
├── scripts/
│   ├── seed-db.sh                     # Initialize database with test data
│   ├── run-tests.sh                   # Run all tests (unit + integration)
│   ├── lint.sh                        # Run linters (ESLint, Prettier)
│   ├── build.sh                       # Build both backend and frontend
│   └── deploy.sh                      # Deploy to production
│
├── .github/
│   ├── workflows/
│   │   ├── test.yml                   # CI/CD pipeline (tests on push)
│   │   ├── lint.yml                   # Linting on PR
│   │   └── build.yml                  # Build artifact generation
│   │
│   └── pull_request_template.md       # PR description template
│
├── .gitignore                         # Exclude node_modules, build artifacts, env files
├── .env.example                       # Root-level environment template
└── docker-compose.yml                 # Full stack orchestration (optional, at root)
```

### Key Files Explained:

| File | Purpose |
|------|---------|
| **README.md** | Quick-start guide, feature overview, local dev setup |
| **PRD.md** | This document; requirements and design philosophy |
| **TASKS.md** | Development task tracker; integration point for Ralph Loop |
| **API.md** | OpenAPI/Swagger documentation of all endpoints |
| **ralph-loop.sh** | Automation script for iterative development |
| **prisma/schema.prisma** | Database schema definition; source of truth for DB |
| **backend/src/** | NestJS backend source code; organized by feature modules |
| **frontend/src/app/** | Next.js pages and routes; organized by feature |
| **frontend/src/components/** | Reusable React components; Apple HIG compliant design |
| **docs/ARCHITECTURE.md** | Deep-dive into system design and decisions |
| **docs/SECURITY.md** | Threat model, encryption strategies, audit logging |

---

## 11. Development Roadmap

### Phase 1: Foundation (Weeks 1–2)
- [ ] Backend: NestJS project, PostgreSQL setup, Prisma migrations
- [ ] Backend: Authentication (OAuth2/JWT) for hospitals and patients
- [ ] Backend: Core consent service and data request routing
- [ ] Database: Initialize schema and audit logging infrastructure

### Phase 2: Patient PWA (Weeks 3–4)
- [ ] Frontend: Next.js PWA bootstrap with TypeScript
- [ ] Frontend: Login, dashboard, and profile screens (Apple HIG)
- [ ] Frontend: Consent inbox and approval workflow
- [ ] Frontend: Consent history and access log views
- [ ] Frontend: PWA offline support and push notifications

### Phase 3: Integration & Testing (Weeks 5–6)
- [ ] Backend: Hospital API endpoints for data retrieval
- [ ] Backend: Integration with mock Hospital A and Hospital B systems
- [ ] Testing: Unit tests (>85% coverage)
- [ ] Testing: End-to-end integration tests
- [ ] Documentation: API documentation and deployment guide

### Phase 4: Deployment & Hardening (Weeks 7+)
- [ ] Security: Penetration testing; vulnerability scanning
- [ ] Performance: Load testing; database query optimization
- [ ] Compliance: HIPAA audit trail, data retention policies
- [ ] DevOps: Docker / Kubernetes setup; CI/CD pipeline
- [ ] Monitoring: Logging, alerting, uptime monitoring

---

## 12. Success Criteria

The CareBridge Middleware is considered ready for MVP launch when:

1. ✅ **Authentication Working:** Hospital OAuth2 and patient JWT flows functional.
2. ✅ **Consent Flow Complete:** Patients can approve/deny requests; consent recorded and audited.
3. ✅ **Data Routing:** Hospital B requests → Middleware routes to Hospital A → Data returned.
4. ✅ **PWA Functional:** Login, QR code display, consent inbox, approval, history working.
5. ✅ **Apple HIG Compliance:** UI minimalist, black-and-white, accessible, fast.
6. ✅ **Testing:** >85% code coverage; integration tests passing.
7. ✅ **Documentation:** API docs, deployment guide, security documentation complete.
8. ✅ **Audit Trail:** All events logged; compliance audit possible.
9. ✅ **Security:** TLS/HTTPS, JWT validation, rate limiting, CORS configured.
10. ✅ **Performance:** API response times <500ms; PWA loads in <3 seconds.

---

## 13. Appendix: Glossary

| Term | Definition |
|------|-----------|
| **UID** | Unique identifier for a patient in CareBridge (e.g., JD-12345-6789) |
| **QR Code** | Machine-readable representation of patient UID; can be scanned for quick reference |
| **Consent Request** | A request from Hospital B to Hospital A (via middleware) for a patient's data with explicit scopes |
| **Consent Record** | A historical record of an approved consent; includes expiry date and scopes granted |
| **Scope** | Type of data being requested (e.g., "allergies", "medications", "diagnoses") |
| **Audit Log** | Immutable record of all events: who accessed what, when, with what result |
| **PWA** | Progressive Web App; web application with mobile app-like features (offline, install, push notifications) |
| **HIG** | Apple Human Interface Guidelines; design standards for Apple products and platforms |
| **OAuth2** | Standard protocol for secure authorization; used for hospital-to-middleware authentication |
| **JWT** | JSON Web Token; compact, self-contained token format for stateless authentication |
| **Ralph Loop** | Iterative development cycle: Define → Execute → Verify → Iterate |
| **HIPAA** | Health Insurance Portability and Accountability Act; US healthcare privacy regulation |
| **GDPR** | General Data Protection Regulation; EU data privacy law |
| **Middleware** | Software layer between hospital systems and patients; handles orchestration, consent, routing |
| **EHR** | Electronic Health Record; hospital's digital patient data system |

---

## 14. References & Resources

- **HIPAA Compliance:** https://www.hhs.gov/hipaa/
- **GDPR Overview:** https://gdpr-info.eu/
- **Apple HIG:** https://developer.apple.com/design/human-interface-guidelines/
- **OAuth2 RFC:** https://tools.ietf.org/html/rfc6749
- **JWT Specification:** https://tools.ietf.org/html/rfc7519
- **NestJS Documentation:** https://docs.nestjs.com/
- **Next.js Documentation:** https://nextjs.org/docs
- **Prisma Documentation:** https://www.prisma.io/docs/
- **PostgreSQL Security:** https://www.postgresql.org/docs/current/sql-syntax.html
- **REST API Best Practices:** https://restfulapi.net/

---

**Document Version:** 1.0  
**Last Updated:** April 20, 2026  
**Status:** Draft – Ready for Review and Implementation
