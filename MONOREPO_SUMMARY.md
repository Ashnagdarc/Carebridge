# CareBridge Monorepo - Complete Organization

**Last Updated:** April 20, 2026  
**Status:** ✅ Complete Structure Ready for Development

---

## 📦 Complete Project Structure

```
CareBridge/                              ← Single Repository (Monorepo)
│
├── 📋 Root Configuration & Documentation
│   ├── package.json                     ← npm workspaces root config
│   ├── docker-compose.yml               ← Full-stack development environment
│   ├── .gitignore                       ← Version control ignore rules
│   └── .env.example                     ← Environment template (to create)
│
├── 📚 Documentation (Root Level)
│   ├── README.md                        ← Quick-start guide (PRIMARY)
│   ├── PRD.md                           ← Complete product requirements
│   ├── TASKS.md                         ← 20 development tasks + Ralph Loop
│   ├── API.md                           ← Full API documentation
│   └── MONOREPO_SUMMARY.md              ← This file
│
├── 🛠️ Scripts (Monorepo Orchestration)
│   ├── scripts/setup.sh                 ← Initialize all services
│   ├── scripts/dev.sh                   ← Start all services (Docker or local)
│   ├── scripts/build.sh                 ← Build all services
│   ├── scripts/test.sh                  ← Test all services
│   ├── scripts/lint.sh                  ← Lint all services
│   └── scripts/deploy.sh                ← Deploy all services (to create)
│
├── 📖 Documentation (Shared)
│   ├── docs/MONOREPO.md                 ← Monorepo structure & boundaries
│   ├── docs/ARCHITECTURE.md             ← System design (to create)
│   ├── docs/DEPLOYMENT.md               ← Deployment guide (to create)
│   ├── docs/SECURITY.md                 ← Security policies (to create)
│   ├── docs/COMPLIANCE.md               ← HIPAA/GDPR compliance (to create)
│   └── docs/DATABASE.md                 ← Schema migration guide (to create)
│
├── 🤖 Ralph Loop Automation
│   ├── ralph-loop.sh                    ← Iterative development automation
│   └── .ralph-logs/                     ← Iteration logs (created at runtime)
│
├── 📦 Service Packages (Independent Deployable Services)
│   │
│   ├── packages/middleware/             ← Middleware Backend API Service
│   │   ├── src/
│   │   │   ├── main.ts                  ← App entry point
│   │   │   ├── app.module.ts            ← Root module
│   │   │   ├── auth/                    ← Authentication (OAuth2/JWT)
│   │   │   ├── consent/                 ← Consent management
│   │   │   ├── patients/                ← Patient management
│   │   │   ├── hospitals/               ← Hospital management
│   │   │   ├── data-requests/           ← Data routing
│   │   │   ├── audit/                   ← Audit logging
│   │   │   ├── notifications/           ← Notifications & WebSocket
│   │   │   ├── common/                  ← Guards, filters, interceptors
│   │   │   └── config/                  ← Configuration
│   │   ├── prisma/
│   │   │   ├── schema.prisma            ← Database schema
│   │   │   ├── seed.ts                  ← Test data seeding
│   │   │   └── migrations/              ← Database migrations
│   │   ├── test/                        ← Unit & integration tests
│   │   ├── package.json                 ← Backend dependencies
│   │   ├── tsconfig.json                ← TypeScript config
│   │   ├── .env.example                 ← Environment template
│   │   ├── Dockerfile                   ← Production image
│   │   ├── Dockerfile.dev               ← Development image
│   │   └── README.md                    ← Service-specific documentation
│   │
│   ├── packages/patient-app/            ← Patient-Facing PWA Service
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx           ← Root layout (HIG styles)
│   │   │   │   ├── auth/                ← Login/signup pages
│   │   │   │   ├── dashboard/           ← Main dashboard
│   │   │   │   ├── consent/             ← Consent inbox & approval
│   │   │   │   └── settings/            ← Settings & profile
│   │   │   ├── components/              ← Reusable React components
│   │   │   ├── hooks/                   ← Custom React hooks
│   │   │   ├── services/                ← API client services
│   │   │   ├── types/                   ← TypeScript interfaces
│   │   │   ├── lib/                     ← Utility functions
│   │   │   └── utils/                   ← Constants & helpers
│   │   ├── public/
│   │   │   ├── manifest.json            ← PWA manifest
│   │   │   ├── sw.js                    ← Service Worker
│   │   │   └── icons/                   ← App icons & assets
│   │   ├── test/                        ← Component & hook tests
│   │   ├── package.json                 ← Frontend dependencies
│   │   ├── tsconfig.json                ← TypeScript config
│   │   ├── next.config.ts               ← Next.js config
│   │   ├── tailwind.config.ts           ← Tailwind CSS config
│   │   ├── .env.example                 ← Environment template
│   │   ├── Dockerfile                   ← Production image
│   │   ├── Dockerfile.dev               ← Development image
│   │   └── README.md                    ← Service-specific documentation
│   │
│   └── packages/admin-dashboard/        ← Admin Dashboard Service (Optional)
│       ├── src/
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── .env.example
│       ├── Dockerfile
│       └── README.md
│
└── .github/                             ← CI/CD (to create)
    └── workflows/
        ├── test.yml
        ├── build.yml
        └── deploy.yml
```

---

## 🚀 Quick Start

### 1. **Initialize Monorepo**
```bash
npm run setup
```

### 2. **Start All Services**
```bash
# Option A: With Docker Compose
npm run docker:up

# Option B: Start locally in separate terminals
npm run dev

# Option C: Individual services
cd packages/middleware && npm run dev
cd packages/patient-app && npm run dev
```

### 3. **Verify Everything**
```bash
npm run build      # Build all services
npm run test       # Test all services
npm run lint       # Check code quality
npm run lint fix   # Fix linting issues
```

---

## 📋 Service Details

### Middleware Service (`packages/middleware/`)

**Purpose:** Backend API for consent management and data routing

**Tech Stack:**
- NestJS (Node.js framework)
- TypeScript
- PostgreSQL (Prisma ORM)
- OAuth2 / JWT authentication
- WebSocket (real-time notifications)

**Ports:** 3000 (dev), 3000 (prod)

**Key Files:**
- `src/auth/` - Hospital OAuth2, Patient JWT
- `src/consent/` - Consent request/approval workflow
- `src/data-requests/` - Data routing between hospitals
- `src/audit/` - Immutable access logging
- `prisma/schema.prisma` - Database schema

---

### Patient App Service (`packages/patient-app/`)

**Purpose:** Mobile-optimized web app for patient consent management

**Tech Stack:**
- Next.js 14+ (React framework)
- TypeScript
- Tailwind CSS (minimalist, Apple HIG design)
- SF Symbols (native iOS icons)
- PWA (Progressive Web App)

**Ports:** 3001 (dev), 80/443 (prod)

**Key Pages:**
- `/` - Login/signup
- `/dashboard` - UID display, QR code
- `/consent/inbox` - Pending requests
- `/consent/history` - Active consents & access logs
- `/settings` - Profile & preferences

---

### Admin Dashboard Service (`packages/admin-dashboard/`)

**Purpose:** Admin interface for system monitoring and auditing

**Tech Stack:**
- Next.js 14+ (React framework)
- TypeScript
- Tailwind CSS

**Ports:** 3002 (dev), 3002 (prod)

**Key Features:**
- Audit log viewer
- Hospital management
- System health monitoring
- Report generation

---

## 🔄 Service Communication

```
┌─────────────────────────┐
│   Patient Browser       │
│  (patient-app PWA)      │
└────────────┬────────────┘
             │
             │ HTTP/HTTPS (REST API)
             │ WebSocket (Notifications)
             ▼
┌─────────────────────────────────────┐
│ Middleware API Service              │
│ (NestJS Backend)                    │
│ - Authentication                    │
│ - Consent Management                │
│ - Data Routing                      │
│ - Audit Logging                     │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐       ┌─────────┐
│Hospital │ ◄──► │Hospital │
│    A    │       │    B    │
└─────────┘       └─────────┘

┌──────────────────────────┐
│   PostgreSQL Database    │
│ - Consent Records        │
│ - Audit Logs             │
│ - Hospital Mappings      │
└──────────────────────────┘
```

---

## 📊 Development Workflow

### Ralph Loop Integration

Each task follows the Ralph Loop methodology:

```
1. DEFINE    → Read task from TASKS.md
              ↓
2. EXECUTE   → Develop feature
              ↓
3. VERIFY    → Run tests & validation
              ↓
4. ITERATE   → Loop back if needed
              ↓
5. COMPLETE  → Mark task done, move to next
```

**Run a task with Ralph Loop:**
```bash
./ralph-loop.sh 1.1 3 development  # Task 1.1, max 3 iterations
./ralph-loop.sh 2.3 2 development  # Task 2.3, max 2 iterations
```

---

## 🐳 Docker Development Environment

### Full Stack with Docker Compose

```bash
# Start everything
npm run docker:up

# View logs
npm run docker:logs

# Stop everything
npm run docker:down
```

**Services Started:**
- PostgreSQL (port 5432)
- Middleware API (port 3000)
- Patient App (port 3001)
- Admin Dashboard (port 3002)
- Mock Hospital A (port 4000)
- Mock Hospital B (port 4001)

---

## 🧪 Testing & Quality

### Run All Tests
```bash
npm run test           # Run all tests
npm run test unit      # Unit tests only
npm run test integration  # Integration tests only
```

### Code Quality
```bash
npm run lint           # Check code quality
npm run lint fix       # Fix issues automatically
npm run format         # Format code with Prettier
```

### Build All Services
```bash
npm run build          # Build all services for production
```

---

## 📝 Development Milestones

| Milestone | Status | Duration | Tasks |
|-----------|--------|----------|-------|
| 1: Backend Foundation | ⬜ Not Started | Weeks 1-2 | 6 tasks |
| 2: Patient PWA | ⬜ Not Started | Weeks 3-4 | 7 tasks |
| 3: Integration & Testing | ⬜ Not Started | Weeks 5-6 | 3 tasks |
| 4: Deployment & Hardening | ⬜ Not Started | Weeks 7+ | 4 tasks |

See [TASKS.md](./TASKS.md) for detailed task breakdown.

---

## 📚 Documentation Map

| Document | Purpose | Read When |
|----------|---------|-----------|
| [README.md](./README.md) | Quick-start guide | First time here |
| [PRD.md](./PRD.md) | Complete product spec | Understanding requirements |
| [TASKS.md](./TASKS.md) | Development tasks | Planning work |
| [API.md](./API.md) | API documentation | Building clients |
| [docs/MONOREPO.md](./docs/MONOREPO.md) | Monorepo structure | Understanding architecture |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design details | Deep technical dive |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security guidelines | Security reviews |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deployment guide | Deploying to production |

---

## ✅ Setup Checklist

- [ ] Clone repository
- [ ] Install Node.js 18+
- [ ] Install Docker & Docker Compose
- [ ] Run `npm run setup`
- [ ] Configure `.env` files
- [ ] Run `npm run docker:up` (or `npm run dev`)
- [ ] Verify services running:
  - [ ] http://localhost:3000/api/v1 (Middleware)
  - [ ] http://localhost:3001 (Patient App)
  - [ ] http://localhost:3002 (Admin Dashboard)
- [ ] Run `npm run test` to verify setup
- [ ] Pick first task from [TASKS.md](./TASKS.md)
- [ ] Start developing!

---

## 🎯 Next Steps

1. ✅ **Understand Structure** - You're reading this document
2. 👉 **Read Documentation** - [README.md](./README.md) → [PRD.md](./PRD.md) → [TASKS.md](./TASKS.md)
3. 👉 **Initialize Services** - `npm run setup`
4. 👉 **Start Development** - Pick a task and run Ralph Loop
5. 👉 **Deploy** - Follow [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 🤝 Contributing

1. Pick a task from [TASKS.md](./TASKS.md)
2. Create a feature branch: `git checkout -b task/1.1-backend-setup`
3. Follow the Ralph Loop: Define → Execute → Verify → Iterate
4. Run tests: `npm run test`
5. Check code quality: `npm run lint`
6. Submit PR with task completion

---

**Project Status:** 🚀 Ready for Development  
**Last Updated:** April 20, 2026  
**Maintainer:** CareBridge Team
