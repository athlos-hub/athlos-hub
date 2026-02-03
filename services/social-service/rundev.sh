#!/bin/bash
set -a

if [ -f "../../.env" ]; then
    echo "📦 Carregando variáveis de ../../.env"
    source ../../.env
fi

if [ -f "../../.env.development" ]; then
    echo "📦 Carregando variáveis de ../../.env.development"
    source ../../.env.development
fi

if [ -f ".env" ]; then
    echo "📦 Carregando variáveis de .env (local)"
    source .env
fi

set +a

export SPRING_PROFILES_ACTIVE=dev

echo ""
echo "🚀 Iniciando social-service em modo desenvolvimento..."
echo "   Profile ativo: dev"
echo "   Database: ${DATABASE_NAME:-social_db}"
echo "   Redis: ${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}"
echo "   Auth Service: ${AUTH_SERVICE_URL:-http://localhost:8000}"
echo "   Porta: ${SERVER_PORT:-8083}"
echo ""

./mvnw spring-boot:run
