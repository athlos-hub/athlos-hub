#!/bin/bash
set -e

echo "🚀 Configurando ambiente de desenvolvimento local..."

# Verifica se o .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado. Copie o .env.example e configure."
    exit 1
fi

# Sobe o postgres
echo "📦 Subindo PostgreSQL..."
docker-compose -f docker-compose-local.yml up -d postgres-local

# Aguarda o postgres ficar pronto
echo "⏳ Aguardando PostgreSQL..."
sleep 15

# Cria os usuários necessários
echo "👤 Criando usuários do banco..."
docker exec -i sports_postgres_local psql -U sports_user_hmg -d sports_platform_hmg <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'auth_service_hmg') THEN
            CREATE USER auth_service_hmg WITH PASSWORD 'AuthHmg2025!@#';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'keycloak_service_hmg') THEN
            CREATE USER keycloak_service_hmg WITH PASSWORD 'KeycloakHmg2025!@#';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'competitions_service_hmg') THEN
            CREATE USER competitions_service_hmg WITH PASSWORD 'CompHmg2025!@#';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'social_service_hmg') THEN
            CREATE USER social_service_hmg WITH PASSWORD 'SocialHmg2025!@#';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'livestream_service_hmg') THEN
            CREATE USER livestream_service_hmg WITH PASSWORD 'LivestreamHmg2025!@#';
        END IF;
    END
    \$\$;
EOSQL

# Restaura o dump
echo "📥 Restaurando banco de dados..."
docker exec -i sports_postgres_local pg_restore \
    -U sports_user_hmg \
    -d sports_platform_hmg \
    --clean \
    --if-exists \
    /backups/dump_latest.backup 2>&1 | grep -v "ERROR.*does not exist" || true

# Configura permissões
echo "🔐 Configurando permissões..."
docker exec -i sports_postgres_local psql -U sports_user_hmg -d sports_platform_hmg <<-EOSQL
    GRANT ALL PRIVILEGES ON SCHEMA auth_schema TO auth_service_hmg;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth_schema TO auth_service_hmg;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth_schema TO auth_service_hmg;
    
    GRANT ALL PRIVILEGES ON SCHEMA keycloak_schema TO keycloak_service_hmg;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA keycloak_schema TO keycloak_service_hmg;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA keycloak_schema TO keycloak_service_hmg;
    
    GRANT ALL PRIVILEGES ON SCHEMA competitions_schema TO competitions_service_hmg;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA competitions_schema TO competitions_service_hmg;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA competitions_schema TO competitions_service_hmg;
    
    GRANT ALL PRIVILEGES ON SCHEMA social_schema TO social_service_hmg;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA social_schema TO social_service_hmg;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA social_schema TO social_service_hmg;
    
    GRANT ALL PRIVILEGES ON SCHEMA livestream_schema TO livestream_service_hmg;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA livestream_schema TO livestream_service_hmg;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA livestream_schema TO livestream_service_hmg;
EOSQL

# Sobe o Keycloak
echo "🔑 Subindo Keycloak..."
docker-compose -f docker-compose-local.yml up -d keycloak-local

echo ""
echo "✅ Ambiente local configurado com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "  1. Aguarde ~30s para o Keycloak iniciar"
echo "  2. Acesse http://localhost:8080 (admin/admin)"
echo "  3. Configure os .env.local de cada serviço"
echo "  4. Rode os serviços com ./rundev.sh"