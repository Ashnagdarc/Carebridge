# CareBridge Middleware

NestJS backend API for consent-based healthcare data exchange.

## Stack

- NestJS 10
- Prisma ORM
- PostgreSQL
- JWT auth + guards
- WebSocket gateways (notifications and defense demo)

## Main Modules

- `auth`
- `patients`
- `hospitals`
- `consent`
- `data-request`
- `audit`
- `notifications`
- `defense`
- `email`
- `health`

## Local Setup

From this directory:

```bash
npm install
cp .env.example .env
npm run prisma:generate
npx prisma db push
npm run dev
```

API base URL: `http://localhost:3000/api/v1`
Swagger UI: `http://localhost:3000/docs`

## Scripts

```bash
npm run dev            # watch mode
npm run build          # nest build
npm run start          # run compiled app
npm run test           # unit/integration tests
npm run test:cov       # coverage
npm run lint           # eslint check
npm run lint:fix       # eslint auto-fix
npm run prisma:generate
npm run prisma:dev
npm run prisma:migrate
npm run prisma:studio
npm run seed
```

## Environment

Primary variables live in `.env.example`, including:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `DEFENSE_HOSPITAL_A_ENDPOINT`
- `DEFENSE_HOSPITAL_B_ENDPOINT`
- `ENABLE_WEBSOCKET_NOTIFICATIONS`
- `ENABLE_PUSH_NOTIFICATIONS`

## Testing

Package-level tests live under:

- `src/**/*.spec.ts`
- `test/*.e2e-spec.ts`

Run all middleware tests:

```bash
npm test
```
