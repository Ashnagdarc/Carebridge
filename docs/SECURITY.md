# CareBridge Security Notes

This document captures the current security posture, implementation details, and how to run basic security checks locally and in CI.

## Transport Security (HTTPS/TLS)

- The Patient PWA requires HTTPS in production (browser/PWA requirement).
- The middleware supports HTTPS enforcement behind a reverse proxy (TLS terminated at the edge).
  - `packages/middleware/src/main.ts` enforces HTTPS when `ENFORCE_HTTPS=true` (defaults to `true` in `NODE_ENV=production`).
  - Set `TRUST_PROXY=true` when running behind an ingress/load balancer so `x-forwarded-proto` and client IPs are interpreted correctly.

### Certificate pinning (mobile)

Certificate pinning is not supported by browsers/PWAs directly. If pinning is required, use a native wrapper (e.g., a WebView container) or device management controls to enforce trusted roots/certs.

## Rate Limiting

- Implemented globally for all HTTP endpoints via `@nestjs/throttler` (middleware service).
- Configuration:
  - `RATE_LIMIT_WINDOW_MS` (default `900000`)
  - `RATE_LIMIT_MAX_REQUESTS` (default `100`)

## CORS Policy

- CORS is allow-list based.
- Configure `CORS_ORIGIN` as a comma-separated list (e.g. `https://pwa.example.com,https://admin.example.com`).
- Non-browser clients without an `Origin` header are allowed.

## Injection & XSS

### SQL injection

- Database access uses Prisma’s query builder APIs; no unsafe raw query helpers are used in the codebase.

### XSS (Patient PWA)

- React escapes rendered content by default.
- No `dangerouslySetInnerHTML` usage is present.
- The PWA ships standard security headers and a CSP in `Report-Only` mode (see `packages/patient-pwa/next.config.mjs`).

Note: Access tokens are currently stored in `localStorage` in the PWA. This increases impact if an XSS bug is introduced. Consider migrating to an `httpOnly` cookie session or a more hardened token storage strategy in a future hardening iteration.

## CSRF

CSRF protections are typically required when authentication relies on cookies automatically attached by the browser. The CareBridge API uses `Authorization: Bearer ...` headers, so CSRF protection is not required in the current design. If cookie-based auth is introduced later, add CSRF tokens at that time.

## Vulnerability Scanning

### npm audit (CI gate: critical only)

- Run: `npm run security:audit`
- CI runs this check and fails only if **critical** vulnerabilities are present.

### OWASP ZAP (manual baseline)

1. Start the middleware locally (and any pages you want scanned).
2. Run: `npm run security:zap -- http://localhost:3000`

The report is written to `.zap/zap-report.html`.

