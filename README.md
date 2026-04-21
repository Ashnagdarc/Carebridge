# CareBridge Middleware

> Secure, consent-based patient data exchange platform enabling regulated health information sharing between hospital systems.

---

## 📋 Quick Navigation

Welcome to CareBridge Middleware! Here's where to find what you need:

| Document | Purpose | Read When |
|----------|---------|-----------|
| **[PRD.md](./PRD.md)** | Complete product requirements & design specifications | Onboarding, design reviews, feature clarification |
| **[TASKS.md](./TASKS.md)** | Development tasks, acceptance criteria, Ralph Loop tracking | Planning sprints, task assignment, progress tracking |
| **[API.md](./API.md)** *(to be created)* | API endpoints, request/response formats, examples | API integration, debugging, testing |
| **[README.md](./README.md)** *(this file)* | Quick reference, setup instructions, getting started | First time here? Start here |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** *(to be created)* | Deep-dive into system architecture, deployment patterns | Understanding the system design |
| **[docs/SECURITY.md](./docs/SECURITY.md)** *(to be created)* | Security policies, threat model, compliance checklist | Security reviews, deployment |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Docker** & Docker Compose (for local database)
- **PostgreSQL** 14+ (or use Docker)
- **Git** for version control

### Project Structure

```
CareBridge/
├── PRD.md                    # 👈 START HERE: Complete product requirements
├── TASKS.md                  # Development tasks and milestones
├── ralph-loop.sh             # Ralph Loop automation script
├── backend/                  # NestJS middleware API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── docker-compose.yml
├── frontend/                 # Next.js patient PWA
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
└── docs/                     # Additional documentation (to be created)
```

### Phase 1: Read the Requirements

1. **Start with PRD.md** (45 min read)
   - Understand the business case and use cases
   - Review system architecture
   - Familiarize yourself with the tech stack
   - See example data flow

2. **Review TASKS.md** (20 min read)
   - Understand development milestones
   - See acceptance criteria for your task
   - Track progress with the Ralph Loop

### Phase 2: Set Up Local Development

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with local database credentials

# Start PostgreSQL (via Docker Compose)
docker-compose up -d postgres

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
# Backend API will be available at http://localhost:3000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with API URL (e.g., http://localhost:3000)

# Start development server
npm run dev
# Frontend will be available at http://localhost:3001
```

### Phase 3: Use the Ralph Loop for Development

The **Ralph Loop** is an iterative development methodology: **Define → Execute → Verify → Iterate**

#### Running a Task with Ralph Loop

```bash
# Run Task 1.1 (Backend Setup) with up to 3 iterations
./ralph-loop.sh 1.1 3 development

# Run Task 2.3 (Dashboard PWA) with 2 iterations
./ralph-loop.sh 2.3 2 development
```

The script will:
1. Read task definition from `TASKS.md`
2. Execute builds and tests
3. Verify acceptance criteria
4. Automatically iterate if tests fail
5. Generate a completion report

#### Ralph Loop Process

```
┌─────────────────────────────────────────┐
│ 1. DEFINE (Read TASKS.md)               │
│    • Task acceptance criteria           │
│    • Dependencies                       │
│    • Success definition                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 2. EXECUTE (Develop)                    │
│    • Write code                         │
│    • Implement features                 │
│    • Follow tech stack guidelines       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. VERIFY (Test)                        │
│    • Run unit tests                     │
│    • Run integration tests              │
│    • Check acceptance criteria          │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
       YES               NO
        │                 │
        ▼                 ▼
     ✅ DONE         🔄 ITERATE
                    (Iteration +1)
                         │
                         └─────────────────┐
                                           │
                    ┌──────────────────────┘
                    │
              Max Iterations?
                    │
        ┌───────────┴───────────┐
        │                       │
       YES                     NO
        │                       │
        ▼                       ▼
   ❌ FAILED              (Retry)
   (Review & Fix)
```

---

## 📝 Development Workflow

### 1. Pick a Task

```bash
# Check available tasks in TASKS.md
# Find one that is "⬜ Not Started" or "🟨 In Progress"
```

### 2. Update Task Status

```markdown
# In TASKS.md, change status to "In Progress"
**Status:** 🟨 In Progress
```

### 3. Develop the Feature

Follow the tech stack and architecture outlined in PRD.md:
- **Backend:** NestJS with TypeScript, Prisma ORM, PostgreSQL
- **Frontend:** Next.js with TypeScript, Tailwind CSS, Apple HIG design
- Implement according to acceptance criteria

### 4. Run Tests & Validation

```bash
# Backend
cd backend
npm run test
npm run build
npm run lint

# Frontend
cd frontend
npm run test
npm run build
npm run lint
```

### 5. Use Ralph Loop to Verify

```bash
./ralph-loop.sh <task_id> 3 development
```

### 6. Update Task Status

Once complete:

```markdown
# In TASKS.md, update:
**Status:** ✅ Complete
**Iterations:** 1/3  ← Update iteration count
```

---

## 🏗️ Key Concepts

### Middleware Architecture

CareBridge Middleware sits between hospital systems:

```
Hospital A ←→ [CareBridge Middleware] ←→ Hospital B
(Data Source)     (Consent & Routing)    (Data Consumer)
                         ↑
                    [Patient PWA]
               (Consent Approval UI)
```

**Key Principle:** Medical data **never** stored in middleware. Only consent records and audit logs.

### Consent Flow

```
1. Hospital B requests patient data
   ↓
2. Middleware checks if patient consent exists
   ├─ If YES: Retrieve data from Hospital A
   └─ If NO: Send consent request to patient
   ↓
3. Patient receives notification & approves via PWA
   ↓
4. Middleware fetches authorized data from Hospital A
   ↓
5. Middleware routes data to Hospital B
   ↓
6. All events audited (immutable log)
```

### Tech Stack Highlights

**Backend:**
- NestJS (enterprise-grade Node.js framework)
- PostgreSQL (ACID compliance, excellent for audit logging)
- Prisma ORM (type-safe database access)
- OAuth2 / JWT (healthcare standard authentication)

**Frontend:**
- Next.js (React framework, optimized PWA support)
- TypeScript (type safety, better IDE support)
- Tailwind CSS (minimalist, Apple HIG compliant)
- SF Symbols (native iOS icons)

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm run test

# Run specific test file
npm run test -- consent.spec.ts

# Run with coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm run test

# Watch mode for development
npm run test:watch
```

### End-to-End Tests

```bash
# (Once backend and frontend are running)
npm run test:e2e
```

---

## 📚 Documentation Standards

When creating new documentation:

1. **Use Markdown** (.md files)
2. **Include Table of Contents** for long documents
3. **Use Clear Headings** (H1 for title, H2 for sections)
4. **Include Code Examples** where helpful
5. **Link to Related Docs** for context
6. **Update this README** if adding major new documentation

---

## 🔐 Security Notes

⚠️ **Important Security Reminders:**

- **Never commit credentials** (.env files, API keys, passwords)
- **Use .env.example** for templates
- **Always use HTTPS** in production
- **Hash passwords** with bcrypt (never plaintext)
- **Validate all inputs** on backend and frontend
- **Log all access** for audit compliance (HIPAA/GDPR)
- **Encrypt sensitive data** at-rest and in-transit

See [docs/SECURITY.md](./docs/SECURITY.md) (to be created) for detailed security guidelines.

---

## 📞 Getting Help

### Common Issues

**Q: Backend won't start**
- Check PostgreSQL is running: `docker-compose ps`
- Check .env file has correct DATABASE_URL
- Check port 3000 is not in use: `lsof -i :3000`

**Q: Frontend build fails**
- Delete `node_modules` and `.next`, then `npm install`
- Check Node.js version: `node --version` (should be 18+)

**Q: Ralph Loop script not working**
- Make script executable: `chmod +x ralph-loop.sh`
- Check logs: `cat .ralph-logs/ralph-loop_*.log`

### Documentation References

- **API Questions:** See [API.md](./API.md) (to be created)
- **Architecture Questions:** See [PRD.md Section 3](./PRD.md#3-system-architecture)
- **Database Schema:** See [PRD.md Section 6](./PRD.md#6-data-model--schema)
- **UI/UX Guidelines:** See [PRD.md Section 8](./PRD.md#8-uiux-style-guide)

---

## 🎯 Next Steps

1. ✅ **Read PRD.md** (familiarize yourself with the system)
2. ✅ **Review TASKS.md** (pick a task to work on)
3. ✅ **Set up local development** (backend + frontend)
4. ✅ **Pick a task** from Milestone 1
5. ✅ **Run ralph-loop.sh** to verify your work
6. ✅ **Update TASKS.md** when complete

---

## 📊 Project Status

**Current Phase:** Foundation (Pre-Development)

| Milestone | Status | Estimated Duration |
|-----------|--------|-------------------|
| 1: Backend Foundation | ⬜ Not Started | Weeks 1–2 |
| 2: Patient PWA | ⬜ Not Started | Weeks 3–4 |
| 3: Integration & Testing | ⬜ Not Started | Weeks 5–6 |
| 4: Deployment & Hardening | ⬜ Not Started | Weeks 7+ |

---

## 📄 License & Credits

**CareBridge Middleware** - Secure Health Data Exchange Platform  
*Last Updated: April 20, 2026*

---

## Quick Links

- **Full PRD:** [PRD.md](./PRD.md)
- **Development Tasks:** [TASKS.md](./TASKS.md)
- **Ralph Loop Script:** [ralph-loop.sh](./ralph-loop.sh)
- **Backend Code:** `./backend`
- **Frontend Code:** `./frontend`

---

**Need Help?** Check the relevant section of [PRD.md](./PRD.md) or run `./ralph-loop.sh --help` for task automation.

Happy coding! 🚀
