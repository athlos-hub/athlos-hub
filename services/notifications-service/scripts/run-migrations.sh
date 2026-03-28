#!/usr/bin/env bash
set -euo pipefail

cd /app/services/notifications-service
alembic -c alembic.ini upgrade head
