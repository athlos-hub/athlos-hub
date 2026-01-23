#!/usr/bin/env bash
set -euo pipefail

# idempotent DB + user creation for local/prod convenience
# expects POSTGRES_USER and POSTGRES_PASSWORD to exist (the container's owner)
# and per-service DB passwords exported as env vars (KEYCLOAK_DB_PASSWORD, AUTH_DB_PASSWORD, COMPETITIONS_DB_PASSWORD, LIVESTREAM_DB_PASSWORD, NOTIFICATIONS_DB_PASSWORD)

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
psql=( psql -v ON_ERROR_STOP=1 -h localhost -U "${POSTGRES_USER:-postgres}" )

# helper: create db if not exists
create_db() {
  local dbname="$1" user="$2" pass_var="$3" pass
  pass="${!pass_var:-}"
  echo "Checking database $dbname..."
  if ! "${psql[@]}" -tAc "SELECT 1 FROM pg_database WHERE datname='${dbname}';" | grep -q 1; then
    echo "Creating database ${dbname} and owner ${user}"
    "${psql[@]}" -c "CREATE USER ${user} WITH PASSWORD '$(printf "%s" "$pass")';" || true
    "${psql[@]}" -c "CREATE DATABASE ${dbname} OWNER ${user};"
  else
    echo "Database ${dbname} already exists"
  fi
}

# create all required DBs
create_db keycloak_db "${KEYCLOAK_DB_USER:-keycloak}" KEYCLOAK_DB_PASSWORD
create_db auth_db "${AUTH_DB_USER:-auth_user}" AUTH_DB_PASSWORD
create_db competitions_db "${COMPETITIONS_DB_USER:-competitions_user}" COMPETITIONS_DB_PASSWORD
create_db livestream_db "${LIVESTREAM_DB_USER:-livestream_user}" LIVESTREAM_DB_PASSWORD
create_db notifications_db "${NOTIFICATIONS_DB_USER:-notifications_user}" NOTIFICATIONS_DB_PASSWORD

echo "Init databases script finished." 
