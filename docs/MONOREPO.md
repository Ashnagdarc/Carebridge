# CareBridge Monorepo Structure

> **Architecture Pattern:** Monorepo with independent services  
> **Repository:** Single `CareBridge` project containing middleware backend, patient PWA, and mock hospital integrations

## 📦 Project Organization

CareBridge is a **single repository** organized as a **monorepo** with distinct, independently-deployable services:

```
CareBridge/
├── packages/
│   ├── middleware/      ← Backend API Service (Node.js/NestJS)
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── patient-pwa/     ← Patient-Facing PWA (Next.js)
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.mjs
│   │
│   ├── mock-hospital-a/ ← Local hospital integration double
│   └── mock-hospital-b/ ← Local hospital integration double
│
├── docs/                ← Shared documentation
├── scripts/             ← Root-level orchestration scripts
├── docker-compose.yml   ← Full-stack local dev
├── package.json         ← Root workspace config
├── PRD.md              ← Product requirements
├── TASKS.md            ← Development tasks
└── ralph-loop.sh       ← Development automation
```

## 🏗️ Service Boundaries

### Middleware Service (`packages/middleware/`)
- **Purpose:** Secure backend API handling authentication, consent, data routing
- **Technology:** NestJS, PostgreSQL, Prisma
- **Port:** 3000
- **Endpoints:** `/api/v1/*`

### Patient App (`packages/patient-app/`)
- **Purpose:** (Deprecated placeholder) A legacy directory; the active app is `packages/patient-pwa/`
- **Technology:** N/A
- **Port:** 3001
- **Routes:** N/A

## 🔄 Service Communication

Services communicate **exclusively via HTTP/HTTPS APIs**:

```
Patient Browser ← HTTP/HTTPS → Middleware API ← HTTPS → Hospitals
                                     ↓
                             PostgreSQL Database
                          (Consent, Audit Logs)
```

## 🚀 Development Workflow

### Setup (First Time)
```bash
npm run setup
```

### Start All Services
```bash
# With Docker Compose
npm run docker:up

# Or locally (3 terminals)
npm run dev  # Shows instructions
```

### Build, Test, Lint
```bash
npm run build
npm run test
npm run lint
npm run lint fix  # Fix issues automatically
```

## 📋 Orchestration Scripts

- `scripts/setup.sh` - Initialize monorepo and all services
- `scripts/dev.sh` - Start all services (Docker or local)
- `scripts/build.sh` - Build all services
- `scripts/test.sh` - Run tests for all services
- `scripts/lint.sh` - Lint and format check all services

## 🎯 Key Benefits

1. **Single Repository** - One codebase, one git history
2. **Independent Services** - Deploy separately, scale independently
3. **Shared Infrastructure** - Common docs, scripts, CI/CD
4. **Clear Boundaries** - Each service has its own package.json and configs
5. **API-Based Communication** - No shared databases or internal messaging

## 📊 Deployment

Each service deployed independently:

```bash
# Middleware
cd packages/middleware && docker build -t carebridge-middleware:latest .
```

---

**For detailed setup and deployment instructions, see README.md**
