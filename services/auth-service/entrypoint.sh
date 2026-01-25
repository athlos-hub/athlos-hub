#!/usr/bin/env bash
set -euo pipefail

## Run alembic migrations then start the app (controlled by RUN_MIGRATIONS flag)
RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}
RUN_MIGRATIONS_LOWER=$(echo "$RUN_MIGRATIONS" | tr '[:upper:]' '[:lower:]')

if [ "$RUN_MIGRATIONS_LOWER" = "true" ] || [ "$RUN_MIGRATIONS_LOWER" = "1" ]; then
    echo "Running migrations via /app/services/auth-service/scripts/run-migrations.sh"
    /app/services/auth-service/scripts/run-migrations.sh
else
    echo "RUN_MIGRATIONS set to '${RUN_MIGRATIONS}'; skipping migrations"
fi

exec uvicorn auth_service.main:app --host 0.0.0.0 --port 8000 --workers 4