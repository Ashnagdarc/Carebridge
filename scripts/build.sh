#!/bin/bash
# CareBridge Build All Services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏗️  Building All Services${NC}"

FAILED=0
for service in middleware patient-pwa defense-dashboard mock-hospital-a mock-hospital-b; do
  if [ -d "$PROJECT_ROOT/packages/$service" ]; then
    echo ""
    echo -e "${GREEN}Building $service...${NC}"
    cd "$PROJECT_ROOT/packages/$service"
    if ! node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.build ? 0 : 1)"; then
      echo "No build script defined for $service; skipping"
      continue
    fi
    if npm run build; then
      echo -e "${GREEN}✓ $service build passed${NC}"
    else
      echo -e "${RED}✗ $service build failed${NC}"
      FAILED=$((FAILED + 1))
    fi
  fi
done

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Build Complete${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED build(s) failed${NC}"
  exit 1
fi
