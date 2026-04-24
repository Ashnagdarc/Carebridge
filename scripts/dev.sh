#!/bin/bash
# CareBridge Development Server - Start all services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-auto}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

has_docker() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

wait_for_docker() {
  if has_docker; then
    return 0
  fi

  if [[ "$(uname)" == "Darwin" && -d "/Applications/Docker.app" ]]; then
    echo -e "${YELLOW}Docker is not running. Opening Docker Desktop...${NC}"
    open -ga Docker

    for _ in {1..60}; do
      if has_docker; then
        echo -e "${GREEN}Docker is ready.${NC}"
        return 0
      fi
      sleep 2
    done
  fi

  return 1
}

docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo -e "${YELLOW}Docker Compose is not installed.${NC}"
    return 1
  fi
}

port_in_use() {
  lsof -ti "tcp:$1" >/dev/null 2>&1
}

check_fixed_ports() {
  local failed=0
  local ports=(3000 3001 4001 4002 5432)

  for port in "${ports[@]}"; do
    if port_in_use "$port"; then
      echo -e "${YELLOW}Port ${port} is already in use.${NC}"
      lsof -n -P -i "tcp:${port}" | sed -n '1,4p'
      failed=1
    fi
  done

  if [ "$failed" -eq 1 ]; then
    echo ""
    echo -e "${RED}CareBridge uses fixed development ports and will not auto-change them.${NC}"
    echo "Stop the processes above, or stop existing CareBridge containers with:"
    echo -e "  ${GREEN}npm run docker:down${NC}"
    return 1
  fi

  return 0
}

compose_has_running_services() {
  [ "$(docker_compose ps --services --filter status=running 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]
}

print_local_instructions() {
  echo -e "${BLUE}🚀 Starting services locally${NC}"
  echo "The middleware also needs PostgreSQL on localhost:5432."
  echo ""
  echo "Option A: start Docker Desktop, then run:"
  echo -e "  ${GREEN}docker compose up postgres${NC}"
  echo ""
  echo "Option B: start a local PostgreSQL service that matches packages/middleware/.env:"
  echo -e "  ${GREEN}database: carebridge_db${NC}"
  echo -e "  ${GREEN}user:     carebridge_user${NC}"
  echo -e "  ${GREEN}password: carebridge_dev_password${NC}"
  echo ""
  echo "Then open 5 terminals and run:"
  echo -e "  ${GREEN}Terminal 1: cd packages/middleware && npx prisma generate && npx prisma db push && npm run dev${NC}"
  echo -e "  ${GREEN}Terminal 2: cd packages/patient-pwa && npm run dev -- --port 3001${NC}"
  echo -e "  ${GREEN}Terminal 3: cd packages/mock-hospital-a && npm run dev${NC}"
  echo -e "  ${GREEN}Terminal 4: cd packages/mock-hospital-b && npm run dev${NC}"
  echo -e "  ${GREEN}Terminal 5: cd packages/defense-dashboard && npm run dev${NC}"
  echo ""
  echo "For just the patient UI:"
  echo -e "  ${GREEN}npm --prefix packages/patient-pwa run dev -- --port 3001${NC}"
  echo ""
  echo "Service URLs:"
  echo -e "  Middleware:    ${BLUE}http://localhost:3000/api/v1${NC}"
  echo -e "  Patient App:   ${BLUE}http://localhost:3001${NC}"
  echo -e "  Defense Demo:  ${BLUE}http://localhost:3002${NC}"
  echo -e "  Hospital A:    ${BLUE}http://localhost:4001${NC}"
  echo -e "  Hospital B:    ${BLUE}http://localhost:4002${NC}"
}

if [ "$MODE" == "auto" ]; then
  if wait_for_docker; then
    MODE="docker"
  else
    echo -e "${YELLOW}Docker is not available, so Docker Compose cannot start.${NC}"
    echo "Install/start Docker Desktop and rerun npm run dev, or use the local commands below."
    MODE="local"
  fi
fi

if [ "$MODE" == "docker" ]; then
  if ! wait_for_docker; then
    echo -e "${YELLOW}Docker is not running.${NC}"
    echo "Start Docker Desktop, then rerun:"
    echo -e "  ${GREEN}npm run dev${NC}"
    echo ""
    print_local_instructions
    exit 1
  fi

  echo -e "${BLUE}🐳 Starting with Docker Compose${NC}"
  cd "$PROJECT_ROOT"
  if ! compose_has_running_services; then
    check_fixed_ports || exit 1
  fi
  docker_compose up
else
  print_local_instructions
fi
