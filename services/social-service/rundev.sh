#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -f ".env" ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

PORT="${API_PORT:-8083}"
exec poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port "$PORT"
