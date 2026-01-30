set -euo pipefail

RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}
RUN_MIGRATIONS_LOWER=$(echo "$RUN_MIGRATIONS" | tr '[:upper:]' '[:lower:]')

if [ "$RUN_MIGRATIONS_LOWER" = "true" ] || [ "$RUN_MIGRATIONS_LOWER" = "1" ]; then
    echo "🚀 Running migrations for Competitions Service..."
    if [ -f "./scripts/run-migrations.sh" ]; then
        chmod +x ./scripts/run-migrations.sh
        ./scripts/run-migrations.sh
    else
        echo "⚠️  run-migrations.sh not found, trying alembic directly..."
        alembic upgrade head
    fi
else
    echo "⏭️  RUN_MIGRATIONS set to '${RUN_MIGRATIONS}'; skipping migrations"
fi

echo "🎯 Starting Competitions application..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 4