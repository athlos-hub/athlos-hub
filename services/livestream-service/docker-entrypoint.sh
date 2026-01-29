#!/bin/sh
set -e

echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🚀 Running Prisma migrations..."

npx prisma migrate deploy || echo "⚠️ Migration failed, continuing..."

echo "✅ Migrations step completed!"
echo "🎯 Starting application..."

exec node dist/main.js