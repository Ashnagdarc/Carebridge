# CareBridge Middleware API

Backend API service for secure health data exchange between hospitals with patient consent management.

## 📋 Overview

- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** OAuth2 + JWT
- **Port:** 3000

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Installation

```bash
npm install
```

### Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed test data (optional)
npm run seed
```

### Development

```bash
npm run dev
```

Server will start at `http://localhost:3000/api/v1`

### Build

```bash
npm run build
```

### Testing

```bash
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # With coverage
```

### Code Quality

```bash
npm run lint           # Check linting
npm run lint:fix       # Fix linting issues
```

## 📁 Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── modules/
│   ├── auth/              # Authentication & OAuth2
│   ├── patients/          # Patient management
│   ├── consent/           # Consent workflows
│   ├── hospitals/         # Hospital management
│   ├── data-request/      # Data routing
│   ├── audit/             # Audit logging
│   └── health/            # Health checks
└── common/                # Shared utilities

prisma/
├── schema.prisma          # Database schema
├── seed.ts               # Test data seeding
└── migrations/           # Database migrations
```

## 🔑 Environment Variables

See `.env.example` for all available configuration options:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRATION` - Token expiration (seconds)
- `CORS_ORIGIN` - CORS allowed origins (comma-separated)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (ms)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window
- `ENFORCE_HTTPS` - Enforce HTTPS (true/false)
- `PORT` - Server port (default: 3000)

## 📚 API Documentation

See [API.md](../../API.md) for complete endpoint documentation.

### Key Endpoints

- `GET /health` - Health check
- `POST /auth/signup` - Patient registration
- `POST /auth/login` - Patient login
- `GET /patients/profile` - Get patient profile
- `POST /consent/request` - Request patient consent
- `GET /consent/requests` - Get pending requests
- `POST /consent/:id/approve` - Approve consent
- `GET /audit-logs` - View audit trail

## 🔐 Security

- Password hashing: bcrypt
- Authentication: JWT tokens
- Encryption: AES-256-GCM for sensitive data at rest
- Transport: HTTPS/TLS 1.3+
- Rate limiting: Implemented on all endpoints
- CORS: Configurable per environment

## 🗄️ Database Schema

7 core tables:
- `Patient` - Patient records
- `Hospital` - Hospital accounts
- `ConsentRequest` - Consent requests
- `ConsentRecord` - Active consents & access logs
- `AuditLog` - Immutable audit trail
- `HospitalMapping` - Hospital relationships
- `Session` - User sessions

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:watch

# Coverage report
npm run test:cov
```

## 🚢 Deployment

### Docker

```bash
# Build
docker build -t carebridge-middleware:latest .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  carebridge-middleware:latest
```

### Environment Setup

1. Create `.env` file with production values
2. Run database migrations: `npm run prisma:migrate -- --skip-generate`
3. Start service: `npm start`

## 📝 Database Migrations

### Create a new migration

```bash
npm run prisma:migrate -- --name your_migration_name
```

### View migration history

```bash
npm run prisma:studio
```

## 🐛 Troubleshooting

**Issue:** Cannot connect to database
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure credentials are valid

**Issue:** Port 3000 already in use
- Change `PORT` environment variable
- Or kill process: `lsof -ti:3000 | xargs kill -9`

**Issue:** JWT validation fails
- Verify `JWT_SECRET` matches across services
- Check token hasn't expired

## 📞 Support

For issues or questions:
1. Check [PRD.md](../../PRD.md) for architecture overview
2. Review [API.md](../../API.md) for endpoint details
3. See logs in `.ralph-logs/` directory

---

**Status:** ✅ Ready for Development  
**Version:** 1.0.0
