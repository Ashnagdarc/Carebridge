# ADR 0002: Bearer-token auth with session tracking

Date: 2026-04-22

## Context

The middleware needs to support:

- patient logins with session management and revocation
- hospital-to-middleware authentication for creating consent and data requests

## Decision

Use Bearer tokens for API requests, and persist session metadata to support:

- refresh token rotation / revocation
- logout-all / session listing

## Notes

- The Patient PWA currently stores tokens in `localStorage`. This is acceptable for development, but increases impact if an XSS bug is introduced; a future iteration should consider `httpOnly` cookies or hardened token storage.

