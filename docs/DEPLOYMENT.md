# Deployment Guide

This guide covers recommended deployment practices for CareBridge services.

## Recommended Production Topology

- **Reverse proxy / ingress** terminates TLS (Nginx/Caddy/ALB/etc.)
- **Middleware** runs as a Node process/container behind the proxy
- **PostgreSQL** runs as a managed DB or a dedicated service
- **Patient PWA** is served via Node (`next start`) or a platform (Vercel/Render/etc.)

## Middleware Production Checklist

- Set `NODE_ENV=production`
- Set `TRUST_PROXY=true` when behind an ingress/load balancer
- Set `ENFORCE_HTTPS=true` (defaults to true in production)
- Set `CORS_ORIGIN` to the exact PWA origin(s), comma-separated
- Rotate secrets:
  - `JWT_SECRET`
  - `OAUTH2_HOSPITAL_SECRET`
  - `ENCRYPTION_KEY` (32+ chars)
- Run database migrations (`prisma migrate deploy` in production workflows)
- Turn off debug logging (`LOG_LEVEL=info`)

## Local Deployment (Docker Compose)

Use Docker Compose for local development:

```bash
npm run docker:up
npm run docker:logs
```

Stop:

```bash
npm run docker:down
```

## Environment Variables

See `packages/middleware/.env.example` and `packages/patient-pwa/README.md` for the full list.

## Backups & Monitoring (Production)

- Enable automated Postgres backups (daily + point-in-time where possible)
- Collect structured logs from middleware (stdout) into your logging stack
- Monitor:
  - error rates (5xx)
  - latency (p95)
  - database connections and slow queries

