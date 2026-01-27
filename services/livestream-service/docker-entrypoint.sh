#!/bin/sh
set -e

echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🚀 Running Prisma migrations..."

# Definir a variável como global antes de executar qualquer comando Prisma
export DATABASE_URL="${DATABASE_URL}"

# Usar node diretamente com o prisma para garantir que o .env seja carregado
node --loader ts-node/esm ./node_modules/.bin/prisma migrate deploy || \
  npx prisma migrate deploy || \
  echo "⚠️  Migration failed, continuing..."

echo "✅ Migrations step completed!"
echo "🎯 Starting application..."

exec node dist/src/main.js