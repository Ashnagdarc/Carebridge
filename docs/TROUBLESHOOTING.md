# Troubleshooting

## Ports already in use

- Change ports via env vars (`PORT`, Next dev port) or stop the process occupying the port.

## Database connection errors

- Verify `DATABASE_URL` matches the running Postgres instance.
- If using Docker Compose, confirm `postgres` is healthy: `docker-compose ps`.

## Prisma client errors

- Regenerate Prisma client: `cd packages/middleware && npm run prisma:generate`
- If schema changed: run migrations (`prisma migrate dev`) or `prisma db push` for local-only changes.

## CORS errors in the browser

- Set `CORS_ORIGIN` to the exact PWA origin (including scheme + port).
- Multiple origins: comma-separated list (e.g. `https://pwa.example.com,http://localhost:3001`).

## 429 Too Many Requests

- Rate limiting is enabled globally.
- Adjust `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` for your environment.

## Swagger UI not available

- In production, Swagger defaults to disabled unless `SWAGGER_ENABLED=true`.

