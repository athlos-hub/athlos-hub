#!/bin/bash

# ============================================================================
# Script para executar testes E2E com containers
# ============================================================================
# Este script sobe os containers necessários e executa os testes E2E
# ============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${CYAN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🧪 ATHLOS HUB - TESTES E2E 🧪          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Função de cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠️  Parando containers de teste...${NC}"
    cd "$ROOT_DIR"
    docker compose -f docker-compose.test.yml down 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# Sobe os containers
echo -e "${CYAN}► Iniciando containers de teste...${NC}"
cd "$ROOT_DIR"
docker compose -f docker-compose.test.yml up -d

# Aguarda os containers ficarem prontos
echo -e "${CYAN}► Aguardando PostgreSQL...${NC}"
until docker exec athlos_postgres_test pg_isready -U postgres &>/dev/null; do
    sleep 1
done
echo -e "${GREEN}✅ PostgreSQL pronto${NC}"

echo -e "${CYAN}► Aguardando Redis...${NC}"
until docker exec athlos_redis_test redis-cli ping &>/dev/null; do
    sleep 1
done
echo -e "${GREEN}✅ Redis pronto${NC}"
echo ""

# Configuração de variáveis
export TEST_POSTGRES_PORT=5433
export TEST_REDIS_PORT=6380
export REDIS_HOST="localhost"
export REDIS_PORT=6380

FAILED=0

# Auth Service E2E
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}► Auth Service - E2E${NC}"
cd "$ROOT_DIR/services/auth-service"
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/auth_test"
if poetry run pytest tests/e2e/ -v --no-cov 2>&1; then
    echo -e "${GREEN}✅ Auth Service E2E: OK${NC}"
else
    echo -e "${RED}❌ Auth Service E2E: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Notifications Service E2E
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}► Notifications Service - E2E${NC}"
cd "$ROOT_DIR/services/notifications-service"
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/notifications_test"
export NOVU_API_KEY="test-api-key"
export NOVU_APP_ID="test-app-id"
if poetry run pytest tests/e2e/ -v --no-cov 2>&1; then
    echo -e "${GREEN}✅ Notifications Service E2E: OK${NC}"
else
    echo -e "${RED}❌ Notifications Service E2E: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Livestream Service E2E
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}► Livestream Service - E2E${NC}"
cd "$ROOT_DIR/services/livestream-service"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/livestream_test?schema=public"

# Executa migrações do Prisma
echo -e "${CYAN}  ► Executando migrações Prisma...${NC}"
pnpm prisma migrate deploy 2>/dev/null || pnpm prisma db push 2>/dev/null || true

if pnpm jest --config test/jest-e2e.config.ts 2>&1; then
    echo -e "${GREEN}✅ Livestream Service E2E: OK${NC}"
else
    echo -e "${RED}❌ Livestream Service E2E: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os testes E2E passaram!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED serviço(s) com falha nos testes E2E${NC}"
    exit 1
fi
