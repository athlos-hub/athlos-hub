#!/bin/sh
set -eu

cd /app

SCHEMA=${AUTH_DATABASE_SCHEMA:-}

if [ -n "$SCHEMA" ]; then
    echo "Ensuring schema exists: ${SCHEMA}"
else
    echo "No schema specified (production mode)"
fi

python - <<'PY'
import psycopg2
import os

user = os.getenv('COMPETITIONS_DATABASE_USER')
password = os.getenv('COMPETITIONS_DATABASE_PASSWORD')
host = os.getenv('DATABASE_HOST', 'postgres')
port = int(os.getenv('DATABASE_PORT', '5432'))
dbname = os.getenv('DATABASE_NAME', 'competitions_db')
schema = os.getenv('COMPETITIONS_DATABASE_SCHEMA', '').strip()  # ✅ Vazio por default

if not user or not password:
    print("COMPETITIONS_DATABASE_USER or COMPETITIONS_DATABASE_PASSWORD not set")
    exit(1)

# Conectar ao banco
conn = psycopg2.connect(
    dbname=dbname,
    user=user,
    password=password,
    host=host,
    port=port
)
conn.autocommit = True
cur = conn.cursor()

# ✅ SÓ criar schema se especificado (dev mode)
if schema:
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    print(f'Schema "{schema}" ensured')
else:
    print('No schema to create (production mode - using database default)')

cur.close()
conn.close()
PY

# Rodar migrations
alembic -c /app/alembic.ini upgrade head
