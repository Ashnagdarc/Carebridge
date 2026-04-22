#!/usr/bin/env bash
set -euo pipefail

echo "CareBridge deploy (local/dev helper)"
echo ""
echo "This repo does not yet include a full production deployment pipeline."
echo "See docs/DEPLOYMENT.md for recommended production topology."
echo ""

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d
  echo "Docker Compose stack is up."
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo "docker-compose is not installed; install Docker Compose or use: npm run docker:up" >&2
  exit 1
fi

echo "Docker is not installed. Install Docker Desktop or run services locally via scripts/dev.sh." >&2
exit 1

