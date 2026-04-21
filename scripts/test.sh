#!/bin/bash
# CareBridge Test All Services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_TYPE="${1:-all}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing All Services (${TEST_TYPE})${NC}"

FAILED=0
for service in middleware patient-app admin-dashboard; do
  if [ -d "$PROJECT_ROOT/packages/$service" ]; then
    echo ""
    echo -e "${GREEN}Testing $service...${NC}"
    cd "$PROJECT_ROOT/packages/$service"
    if npm test; then
      echo -e "${GREEN}✓ $service tests passed${NC}"
    else
      echo -e "${RED}✗ $service tests failed${NC}"
      FAILED=$((FAILED + 1))
    fi
  fi
done

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All Tests Passed${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED test suite(s) failed${NC}"
  exit 1
fi
