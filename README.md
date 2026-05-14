# CareBridge

Secure, consent-driven health data exchange platform built as a JavaScript/TypeScript monorepo.

## What is in this repo

- `packages/middleware`: NestJS + Prisma + PostgreSQL backend (`:3000`)
- `packages/patient-pwa`: Next.js patient app/PWA (`:3001`)
- `packages/defense-dashboard`: Vite React defense demo dashboard (`:3002`)
- `packages/mock-hospital-a`: Express mock source hospital (`:4001`)
- `packages/mock-hospital-b`: Express mock destination hospital (`:4002`)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop (recommended for local full stack)

### 1) Install

```bash
npm install
```

### 2) Configure env files

```bash
cp packages/middleware/.env.example packages/middleware/.env
cp packages/patient-pwa/.env.example packages/patient-pwa/.env.local
cp packages/defense-dashboard/.env.example packages/defense-dashboard/.env
```

### 3) Run everything

```bash
npm run dev
```

`npm run dev` uses `scripts/dev.sh` and prefers Docker Compose when Docker is available.

### Core URLs

- Middleware API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs`
- Patient PWA: `http://localhost:3001`
- Defense Dashboard: `http://localhost:3002`
- Mock Hospital A: `http://localhost:4001`
- Mock Hospital B: `http://localhost:4002`

## Useful Commands

At repo root:

```bash
npm run setup          # Bootstrap dependencies + default env scaffolding
npm run dev            # Start development stack
npm run build          # Build all services that define a build script
npm run test           # Run all service tests that define a test script
npm run lint           # Lint all services that define lint scripts
npm run docker:up      # Start docker-compose services detached
npm run docker:down    # Stop docker-compose services
npm run docker:logs    # Follow compose logs
```

## Project Structure

```txt
CareBridge/
├── docs/
├── scripts/
├── packages/
│   ├── middleware/
│   ├── patient-pwa/
│   ├── defense-dashboard/
│   ├── mock-hospital-a/
│   └── mock-hospital-b/
├── docker-compose.yml
└── package.json
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Monorepo Structure](docs/MONOREPO.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [API Reference](API.md)

## Notes

- Middleware persists consent, auth/session, and audit metadata in PostgreSQL.
- Mock hospitals are local integration doubles used by middleware routing flows.
- Patient-facing flow includes auth, consent inbox/history, approval screens, and settings.
