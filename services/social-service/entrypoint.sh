#!/bin/sh
set -eu

RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}
RUN_MIGRATIONS_LOWER=$(echo "$RUN_MIGRATIONS" | tr '[:upper:]' '[:lower:]')

if [ "$RUN_MIGRATIONS_LOWER" = "true" ] || [ "$RUN_MIGRATIONS_LOWER" = "1" ]; then
    /app/services/social-service/scripts/run-migrations.sh
fi

PORT=${API_PORT:-8083}
exec uvicorn src.main:app --host 0.0.0.0 --port "$PORT" --workers 1
