# Task 2.7 Completion Summary: Real-Time Notifications (WebSocket & Push)

**Status:** ✅ Complete  
**Date Completed:** April 21, 2026  
**Iterations:** 1/3

---

## ✅ What Was Implemented

### Middleware (NestJS)
- WebSocket endpoint for patient notifications: `GET ws://<middleware-host>/ws/notifications?token=<PATIENT_JWT>`
- Consent request creation now emits a `consent_request_created` event to the target patient.
- Web Push subscription storage (Prisma) + delivery via VAPID (optional, behind env flag).
- Patient-authenticated endpoints:
  - `POST /api/v1/notifications/push/subscribe`
  - `DELETE /api/v1/notifications/push/unsubscribe`

### Patient PWA (Next.js)
- Persistent WebSocket client connection (auto-reconnect) that:
  - Shows an in-app toast when a new consent request arrives.
  - Supports click-to-navigate → `/consents/approve/:id`.
  - Updates a badge counter on the **Inbox** bottom tab.
- Push notifications opt-in toggle on Settings → Notifications.
- Service worker hook for push events via `next-pwa` `importScripts`.

---

## 📁 Files Changed / Added

### Middleware
- `packages/middleware/src/modules/notifications/*` (new module: gateway + push + controller)
- `packages/middleware/src/modules/consent/consent.service.ts` (emit notification on creation)
- `packages/middleware/prisma/schema.prisma` (new `PushSubscription` model)
- `packages/middleware/src/main.ts` (WebSocket adapter: `@nestjs/platform-ws`)

### Patient PWA
- `packages/patient-pwa/src/providers/NotificationsProvider.tsx` (WS + push orchestration)
- `packages/patient-pwa/public/notifications-sw.js` (push + notification click handling)
- `packages/patient-pwa/next.config.mjs` (adds `importScripts`)
- `packages/patient-pwa/src/components/BottomTabs.tsx` (Inbox badge)
- `packages/patient-pwa/src/providers/ToastProvider.tsx` (clickable toasts)

---

## 🔧 Configuration Notes (Push)

Push delivery is disabled by default. Enable it by setting in `packages/middleware/.env`:
- `ENABLE_PUSH_NOTIFICATIONS=true`
- `VAPID_PUBLIC_KEY=...`
- `VAPID_PRIVATE_KEY=...`
- `VAPID_SUBJECT=mailto:admin@carebridge.local`

Then set in the PWA:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...` (same public key)

