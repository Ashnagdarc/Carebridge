#!/bin/bash
# CareBridge Build All Services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏗️  Building All Services${NC}"

for service in middleware patient-app admin-dashboard; do
  if [ -d "$PROJECT_ROOT/packages/$service" ]; then
    echo ""
    echo -e "${GREEN}Building $service...${NC}"
    cd "$PROJECT_ROOT/packages/$service"
    npm run build || echo -e "${RED}⚠ $service build had issues${NC}"
  fi
done

echo ""
echo -e "${BLUE}✅ Build Complete${NC}"
