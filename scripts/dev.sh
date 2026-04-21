#!/bin/bash
# CareBridge Development Server - Start all services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-docker}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ "$MODE" == "docker" ]; then
  echo -e "${BLUE}🐳 Starting with Docker Compose${NC}"
  cd "$PROJECT_ROOT"
  docker-compose up
else
  echo -e "${BLUE}🚀 Starting services locally${NC}"
  echo "Open 3 terminals and run:"
  echo -e "  ${GREEN}Terminal 1: cd packages/middleware && npm run dev${NC}"
  echo -e "  ${GREEN}Terminal 2: cd packages/patient-app && npm run dev${NC}"
  echo -e "  ${GREEN}Terminal 3: cd packages/admin-dashboard && npm run dev${NC}"
  echo ""
  echo "Service URLs:"
  echo -e "  Middleware:    ${BLUE}http://localhost:3000/api/v1${NC}"
  echo -e "  Patient App:   ${BLUE}http://localhost:3001${NC}"
  echo -e "  Admin:         ${BLUE}http://localhost:3002${NC}"
fi
