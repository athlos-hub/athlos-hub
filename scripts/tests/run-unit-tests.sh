#!/bin/bash

# ============================================================================
# Script rápido para executar testes unitários (sem containers)
# ============================================================================
# Este script executa apenas os testes unitários de todos os serviços
# Não requer containers, usa SQLite em memória
# ============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${CYAN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🧪 ATHLOS HUB - TESTES UNITÁRIOS 🧪       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

FAILED=0

# Auth Service
echo -e "${CYAN}► Auth Service${NC}"
cd "$ROOT_DIR/services/auth-service"
if poetry run pytest tests/unit/ -v --no-cov 2>&1; then
    echo -e "${GREEN}✅ Auth Service: OK${NC}"
else
    echo -e "${RED}❌ Auth Service: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Competitions Service
echo -e "${CYAN}► Competitions Service${NC}"
cd "$ROOT_DIR/services/competitions-service"
if [ -f ".env.test" ]; then
    export $(grep -v '^#' .env.test | xargs)
fi
if poetry run pytest tests/unit/ -v --no-cov 2>&1; then
    echo -e "${GREEN}✅ Competitions Service: OK${NC}"
else
    echo -e "${RED}❌ Competitions Service: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Notifications Service
echo -e "${CYAN}► Notifications Service${NC}"
cd "$ROOT_DIR/services/notifications-service"
export NOVU_API_KEY="test-api-key"
export NOVU_APP_ID="test-app-id"
if poetry run pytest tests/unit/ -v --no-cov 2>&1; then
    echo -e "${GREEN}✅ Notifications Service: OK${NC}"
else
    echo -e "${RED}❌ Notifications Service: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Livestream Service
echo -e "${CYAN}► Livestream Service${NC}"
cd "$ROOT_DIR/services/livestream-service"
if pnpm jest --testPathPattern='spec\.ts$' --passWithNoTests 2>&1; then
    echo -e "${GREEN}✅ Livestream Service: OK${NC}"
else
    echo -e "${RED}❌ Livestream Service: FALHOU${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os testes unitários passaram!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED serviço(s) com falha${NC}"
    exit 1
fi
