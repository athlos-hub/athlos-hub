#!/usr/bin/env bash
set -euo pipefail

cd /app

SCHEMA=${NOTIFICATIONS_DATABASE_SCHEMA:-}

if [ -n "$SCHEMA" ]; then
    echo "Ensuring schema exists: ${SCHEMA}"
else
    echo "No schema specified (production mode)"
fi

python - <<'PY'
import psycopg2
import os

user = os.getenv('NOTIFICATIONS_DATABASE_USER')
password = os.getenv('NOTIFICATIONS_DATABASE_PASSWORD')
host = os.getenv('DATABASE_HOST', 'postgres')
port = int(os.getenv('DATABASE_PORT', '5432'))
dbname = os.getenv('DATABASE_NAME', 'notifications_db')
schema = os.getenv('NOTIFICATIONS_DATABASE_SCHEMA', '').strip()

if not user or not password:
    print("NOTIFICATIONS_DATABASE_USER or NOTIFICATIONS_DATABASE_PASSWORD not set")
    exit(1)

conn = psycopg2.connect(
    dbname=dbname,
    user=user,
    password=password,
    host=host,
    port=port
)
conn.autocommit = True
cur = conn.cursor()

if schema:
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    print(f'Schema "{schema}" ensured')
else:
    print('No schema to create (production mode - using database default)')

cur.close()
conn.close()
PY

# Run alembic from the service folder so script_location (which is 'alembic')
# resolves relative to the config file.
cd /app/services/notifications-service
alembic -c alembic.ini upgrade head
