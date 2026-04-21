#!/bin/bash
# CareBridge Monorepo Setup - Initialize all services

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 CareBridge Monorepo Setup${NC}"
echo ""

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi

echo "✓ Node.js $(node -v) found"

cd "$PROJECT_ROOT"
echo "📦 Installing root dependencies..."
npm install || npm install --legacy-peer-deps

# Create middleware .env if it doesn't exist
if [ -d "packages/middleware" ] && [ ! -f "packages/middleware/.env" ]; then
  cat > packages/middleware/.env << 'ENV_EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://carebridge_user:carebridge_dev_password@localhost:5432/carebridge_db
JWT_SECRET=dev_jwt_secret_key_change_in_production
PATIENT_APP_URL=http://localhost:3001
LOG_LEVEL=debug
ENV_EOF
  echo "✓ Created middleware .env"
fi

# Create patient-app .env.local if it doesn't exist
if [ -d "packages/patient-app" ] && [ ! -f "packages/patient-app/.env.local" ]; then
  cat > packages/patient-app/.env.local << 'ENV_EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_APP_NAME=CareBridge
NEXT_PUBLIC_ENV=development
ENV_EOF
  echo "✓ Created patient-app .env.local"
fi

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Start services: npm run dev"
echo "  - Or with Docker:  npm run docker:up"
echo "  - Or individually: cd packages/middleware && npm run dev"
echo ""
