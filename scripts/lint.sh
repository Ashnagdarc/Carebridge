#!/bin/bash
# CareBridge Lint All Services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION="${1:-check}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$ACTION" == "fix" ]; then
  echo -e "${BLUE}🔧 Fixing Linting Issues${NC}"
  LINT_CMD="npm run lint:fix || npm run lint -- --fix"
else
  echo -e "${BLUE}🔍 Checking Code Quality${NC}"
  LINT_CMD="npm run lint"
fi

FAILED=0
for service in middleware patient-pwa mock-hospital-a mock-hospital-b; do
  if [ -d "$PROJECT_ROOT/packages/$service" ]; then
    echo ""
    echo -e "${GREEN}Linting $service...${NC}"
    cd "$PROJECT_ROOT/packages/$service"
    if ! node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.lint ? 0 : 1)"; then
      echo "No lint script defined for $service; skipping"
      continue
    fi
    if eval "$LINT_CMD"; then
      echo -e "${GREEN}✓ $service linting passed${NC}"
    else
      echo -e "${RED}⚠ $service linting had issues${NC}"
      FAILED=$((FAILED + 1))
    fi
  fi
done

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ All Linting Passed${NC}"
  exit 0
else
  echo ""
  echo "To fix issues: ./scripts/lint.sh fix"
  exit 1
fi
