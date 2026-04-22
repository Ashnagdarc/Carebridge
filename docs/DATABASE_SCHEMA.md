# Database Schema (Middleware)

The middleware uses PostgreSQL via Prisma. The schema source of truth is:

- `packages/middleware/prisma/schema.prisma`

## Tables / Models

- `Patient`: Patient profile + auth fields; owns consent requests/records, sessions, audit logs.
- `Hospital`: Hospital accounts + endpoints; owns mappings and audit logs.
- `ConsentRequest`: Pending approval requests created by hospitals.
- `ConsentRecord`: Approved consent records and access metadata.
- `DataRequest`: Routing requests between hospitals (latency, status, response metadata).
- `AuditLog`: Immutable audit trail for consent/auth/routing events.
- `Session`: Refresh/access session tracking for revocation.
- `PushSubscription`: Web push subscriptions per patient device.
- `HospitalMapping`: Cross-hospital mapping metadata.

## Indexing

Prisma defines indexes for common lookup paths (patientId/hospitalId/status/createdAt). Review and extend indexes during performance hardening based on real query patterns.

