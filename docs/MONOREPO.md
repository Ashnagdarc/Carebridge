# CareBridge Monorepo

## Layout

```txt
CareBridge/
├── docs/                          # Shared technical documentation
├── scripts/                       # Root orchestration scripts
├── packages/
│   ├── middleware/                # NestJS API + Prisma + PostgreSQL
│   ├── patient-pwa/               # Next.js patient-facing PWA
│   ├── defense-dashboard/         # Vite React dashboard for defense demo
│   ├── mock-hospital-a/           # Mock source hospital API
│   └── mock-hospital-b/           # Mock destination hospital API
├── docker-compose.yml             # Local multi-service stack
└── package.json                   # npm workspaces + root scripts
```

## Service Responsibilities

- `middleware`: auth, consent, data request routing, notifications, audit, health, hospital integrations.
- `patient-pwa`: patient login/signup, consent approvals, consent history, dashboard, settings.
- `defense-dashboard`: dashboard UI consuming defense middleware/ws endpoints.
- `mock-hospital-a` and `mock-hospital-b`: deterministic APIs used in integration and demo flows.

## Default Ports

- Middleware API: `3000`
- Patient PWA: `3001`
- Defense Dashboard: `3002`
- Mock Hospital A: `4001`
- Mock Hospital B: `4002`
- Postgres: `5432`

## Root Scripts

- `npm run setup`: installs dependencies and generates baseline local env where applicable.
- `npm run dev`: starts stack (Docker Compose when Docker is available).
- `npm run build`: runs each package build script if present.
- `npm run test`: runs each package test script if present.
- `npm run lint`: runs each package lint script if present.

## Workspace Notes

- Packages are managed with npm workspaces via `packages/*`.
- Each package keeps its own lockfile and scripts.
- CI and local tooling should execute from repo root unless package-specific behavior is required.
