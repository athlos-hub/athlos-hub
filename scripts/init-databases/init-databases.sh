#!/bin/sh
set -e

PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
export PGPASSWORD

create_db() {
  dbname="$1"
  user="$2"
  pass_var="$3"

  eval pass="\$$pass_var"

  echo "Checking database $dbname..."
  exists=$(psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -tAc "SELECT 1 FROM pg_database WHERE datname='$dbname';")

  if [ "$exists" != "1" ]; then
    echo "Creating database $dbname and user $user..."
    psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -c "CREATE USER $user WITH PASSWORD '$(printf "%s" "$pass")';"
    psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -c "CREATE DATABASE $dbname OWNER $user;"
  else
    echo "Database $dbname already exists. Ensuring ownership and updating password..."
    psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -c "ALTER USER $user WITH PASSWORD '$(printf "%s" "$pass")';"
    psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -c "ALTER DATABASE $dbname OWNER TO $user;"
  fi

  echo "Configuring schema permissions for $user on $dbname..."
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "$dbname" <<-EOSQL
    -- Garante que o usuário é dono do schema public (Vital para Postgres 15+)
    ALTER SCHEMA public OWNER TO $user;
    
    -- Concede permissões explícitas para garantir que não haja erros de 'permission denied'
    GRANT ALL ON SCHEMA public TO $user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $user;
    
    -- Configura permissões automáticas para tabelas criadas no futuro
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $user;
EOSQL
}

# Chamadas para criar os bancos dos seus microserviços
create_db keycloak_db "${KEYCLOAK_DB_USER:-keycloak}" KEYCLOAK_DB_PASSWORD
create_db auth_db "${AUTH_DB_USER:-auth_user}" AUTH_DB_PASSWORD
create_db competitions_db "${COMPETITIONS_DB_USER:-competitions_user}" COMPETITIONS_DB_PASSWORD
create_db livestream_db "${LIVESTREAM_DB_USER:-livestream_user}" LIVESTREAM_DB_PASSWORD
create_db notifications_db "${NOTIFICATIONS_DB_USER:-notifications_user}" NOTIFICATIONS_DB_PASSWORD

echo "Database initialization finished successfully."