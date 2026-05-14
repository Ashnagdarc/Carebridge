# CareBridge Patient PWA

Next.js patient-facing Progressive Web App for authentication, consent actions, and account settings.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- next-pwa
- Jest + Playwright

## Core Routes

- `/` landing page
- `/login`, `/signup`
- `/forgot-password`, `/reset-password`
- `/dashboard`
- `/consents`
- `/consents/history`
- `/consents/approve/[id]`
- `/settings`
- `/privacy`, `/terms`

## Local Setup

From this directory:

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 3001
```

App URL: `http://localhost:3001`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:watch
npm run test:e2e
```

## Environment

Set in `.env.local`:

- `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`)
- `NEXT_PUBLIC_API_VERSION` (default `v1`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (optional for push)

## Notes

- Service worker and manifest are in `public/`.
- Push notifications require middleware VAPID configuration and `ENABLE_PUSH_NOTIFICATIONS=true`.
