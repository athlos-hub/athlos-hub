#!/bin/bash

# ============================================================================
# Script para executar todos os testes dos serviços
# ============================================================================
#
# USO:
#   ./scripts/tests/run-all-tests.sh [opções]
#
# OPÇÕES:
#   --unit              Executa apenas testes unitários (sem containers)
#   --integration       Executa apenas testes de integração
#   --e2e               Executa apenas testes E2E (requer containers)
#   --all               Executa todos os testes (padrão)
#   --service <nome>    Executa testes de um serviço específico
#                       (auth, competitions, notifications, livestream, social)
#   --no-containers     Não inicia/para containers (usa existentes)
#   --coverage          Gera relatório de cobertura
#   --verbose           Saída detalhada
#   --help              Mostra esta ajuda
#
# EXEMPLOS:
#   ./scripts/tests/run-all-tests.sh --unit
#   ./scripts/tests/run-all-tests.sh --e2e --service auth
#   ./scripts/tests/run-all-tests.sh --all --coverage
#
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Diretório raiz do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Variáveis de configuração
RUN_UNIT=false
RUN_INTEGRATION=false
RUN_E2E=false
RUN_ALL=false
SPECIFIC_SERVICE=""
START_CONTAINERS=true
COVERAGE=false
VERBOSE=false
TEST_RESULTS=()
FAILED_TESTS=()

# Configuração de containers de teste
TEST_POSTGRES_CONTAINER="athlos_postgres_test"
TEST_REDIS_CONTAINER="athlos_redis_test"
TEST_POSTGRES_PORT=5433
TEST_REDIS_PORT=6380

# ============================================================================
# Funções auxiliares
# ============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║             🧪  ATHLOS HUB - TEST RUNNER  🧪                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

show_help() {
    head -30 "$0" | tail -27
    exit 0
}

# ============================================================================
# Parsing de argumentos
# ============================================================================

parse_args() {
    if [ $# -eq 0 ]; then
        RUN_ALL=true
    fi

    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                RUN_UNIT=true
                shift
                ;;
            --integration)
                RUN_INTEGRATION=true
                shift
                ;;
            --e2e)
                RUN_E2E=true
                shift
                ;;
            --all)
                RUN_ALL=true
                shift
                ;;
            --service)
                SPECIFIC_SERVICE="$2"
                shift 2
                ;;
            --no-containers)
                START_CONTAINERS=false
                shift
                ;;
            --coverage)
                COVERAGE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                print_error "Opção desconhecida: $1"
                show_help
                ;;
        esac
    done

    # Se nenhuma categoria específica foi selecionada, executa todas
    if [ "$RUN_UNIT" = false ] && [ "$RUN_INTEGRATION" = false ] && [ "$RUN_E2E" = false ] && [ "$RUN_ALL" = false ]; then
        RUN_ALL=true
    fi

    if [ "$RUN_ALL" = true ]; then
        RUN_UNIT=true
        RUN_INTEGRATION=true
        RUN_E2E=true
    fi
}

# ============================================================================
# Gerenciamento de Containers de Teste
# ============================================================================

start_test_containers() {
    print_section "🐳 Iniciando Containers de Teste"
    
    # Verifica se Docker está disponível
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado ou não está no PATH"
        exit 1
    fi

    # PostgreSQL de teste
    if docker ps -a --format '{{.Names}}' | grep -q "^${TEST_POSTGRES_CONTAINER}$"; then
        print_info "Container PostgreSQL de teste já existe"
        if ! docker ps --format '{{.Names}}' | grep -q "^${TEST_POSTGRES_CONTAINER}$"; then
            print_info "Iniciando container PostgreSQL..."
            docker start $TEST_POSTGRES_CONTAINER
        fi
    else
        print_info "Criando container PostgreSQL de teste..."
        docker run -d \
            --name $TEST_POSTGRES_CONTAINER \
            -p ${TEST_POSTGRES_PORT}:5432 \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=postgres \
            postgres:15-alpine
    fi

    # Redis de teste
    if docker ps -a --format '{{.Names}}' | grep -q "^${TEST_REDIS_CONTAINER}$"; then
        print_info "Container Redis de teste já existe"
        if ! docker ps --format '{{.Names}}' | grep -q "^${TEST_REDIS_CONTAINER}$"; then
            print_info "Iniciando container Redis..."
            docker start $TEST_REDIS_CONTAINER
        fi
    else
        print_info "Criando container Redis de teste..."
        docker run -d \
            --name $TEST_REDIS_CONTAINER \
            -p ${TEST_REDIS_PORT}:6379 \
            redis:7-alpine
    fi

    # Aguarda os containers ficarem prontos
    print_info "Aguardando containers ficarem prontos..."
    sleep 3

    # Verifica se PostgreSQL está pronto
    local max_attempts=30
    local attempt=0
    while ! docker exec $TEST_POSTGRES_CONTAINER pg_isready -U postgres &>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            print_error "PostgreSQL não ficou pronto a tempo"
            exit 1
        fi
        sleep 1
    done
    print_success "PostgreSQL pronto!"

    # Verifica se Redis está pronto
    attempt=0
    while ! docker exec $TEST_REDIS_CONTAINER redis-cli ping &>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            print_error "Redis não ficou pronto a tempo"
            exit 1
        fi
        sleep 1
    done
    print_success "Redis pronto!"

    # Cria os databases necessários
    print_info "Criando databases de teste..."
    docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE IF NOT EXISTS auth_test;" 2>/dev/null || \
        docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE auth_test;" 2>/dev/null || true
    docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE IF NOT EXISTS competitions_test;" 2>/dev/null || \
        docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE competitions_test;" 2>/dev/null || true
    docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE IF NOT EXISTS notifications_test;" 2>/dev/null || \
        docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE notifications_test;" 2>/dev/null || true
    docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE IF NOT EXISTS livestream_test;" 2>/dev/null || \
        docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE livestream_test;" 2>/dev/null || true
    docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE IF NOT EXISTS social_test;" 2>/dev/null || \
        docker exec $TEST_POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE social_test;" 2>/dev/null || true
    
    print_success "Databases de teste criados!"

    # Exporta variáveis de ambiente
    export TEST_POSTGRES_PORT=$TEST_POSTGRES_PORT
    export TEST_REDIS_PORT=$TEST_REDIS_PORT
    export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:${TEST_POSTGRES_PORT}"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:${TEST_POSTGRES_PORT}"
    export REDIS_HOST="localhost"
    export REDIS_PORT=$TEST_REDIS_PORT
}

stop_test_containers() {
    print_section "🛑 Parando Containers de Teste"
    
    if docker ps --format '{{.Names}}' | grep -q "^${TEST_POSTGRES_CONTAINER}$"; then
        print_info "Parando PostgreSQL de teste..."
        docker stop $TEST_POSTGRES_CONTAINER
    fi

    if docker ps --format '{{.Names}}' | grep -q "^${TEST_REDIS_CONTAINER}$"; then
        print_info "Parando Redis de teste..."
        docker stop $TEST_REDIS_CONTAINER
    fi

    print_success "Containers parados!"
}

cleanup_test_containers() {
    print_info "Limpando containers de teste..."
    docker rm -f $TEST_POSTGRES_CONTAINER 2>/dev/null || true
    docker rm -f $TEST_REDIS_CONTAINER 2>/dev/null || true
}

# ============================================================================
# Funções de Teste por Serviço
# ============================================================================

run_auth_service_tests() {
    local test_type=$1
    local service_dir="$ROOT_DIR/services/auth-service"
    
    print_section "🔐 Auth Service - Testes $test_type"
    
    cd "$service_dir"

    # Verifica se poetry está instalado
    if ! command -v poetry &> /dev/null; then
        print_error "Poetry não está instalado"
        return 1
    fi

    # Instala dependências se necessário
    if [ ! -d ".venv" ]; then
        print_info "Instalando dependências..."
        poetry install --with dev
    fi

    local pytest_args="-v"
    local test_path=""
    
    case $test_type in
        "unit")
            test_path="tests/unit/"
            pytest_args="$pytest_args --no-cov"
            ;;
        "integration")
            test_path="tests/routes/"
            pytest_args="$pytest_args --no-cov"
            ;;
        "e2e")
            test_path="tests/e2e/"
            pytest_args="$pytest_args --no-cov"
            export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:${TEST_POSTGRES_PORT}/auth_test"
            ;;
    esac

    if [ "$COVERAGE" = true ]; then
        pytest_args="$pytest_args --cov=src --cov-report=term-missing --cov-report=html"
    fi

    if [ "$VERBOSE" = true ]; then
        pytest_args="$pytest_args -s"
    fi

    print_info "Executando: poetry run pytest $test_path $pytest_args"
    
    if poetry run pytest $test_path $pytest_args; then
        TEST_RESULTS+=("auth-service:$test_type:PASS")
        print_success "Auth Service - $test_type: OK"
        return 0
    else
        TEST_RESULTS+=("auth-service:$test_type:FAIL")
        FAILED_TESTS+=("auth-service:$test_type")
        print_error "Auth Service - $test_type: FALHOU"
        return 1
    fi
}

run_competitions_service_tests() {
    local test_type=$1
    local service_dir="$ROOT_DIR/services/competitions-service"
    
    print_section "🏆 Competitions Service - Testes $test_type"
    
    cd "$service_dir"

    if ! command -v poetry &> /dev/null; then
        print_error "Poetry não está instalado"
        return 1
    fi

    if [ ! -d ".venv" ]; then
        print_info "Instalando dependências..."
        poetry install --with dev
    fi

    local pytest_args="-v"
    local test_path=""
    
    case $test_type in
        "unit")
            test_path="tests/unit/"
            pytest_args="$pytest_args --no-cov"
            ;;
        "integration")
            test_path="tests/routes/"
            pytest_args="$pytest_args --no-cov"
            ;;
        "e2e")
            print_warning "Competitions Service não tem testes E2E configurados"
            return 0
            ;;
    esac

    if [ "$COVERAGE" = true ]; then
        pytest_args="$pytest_args --cov=src --cov-report=term-missing --cov-report=html"
    fi

    if [ "$VERBOSE" = true ]; then
        pytest_args="$pytest_args -s"
    fi

    # Carrega variáveis do .env.test
    if [ -f ".env.test" ]; then
        export $(grep -v '^#' .env.test | xargs)
    fi

    print_info "Executando: poetry run pytest $test_path $pytest_args"
    
    if poetry run pytest $test_path $pytest_args; then
        TEST_RESULTS+=("competitions-service:$test_type:PASS")
        print_success "Competitions Service - $test_type: OK"
        return 0
    else
        TEST_RESULTS+=("competitions-service:$test_type:FAIL")
        FAILED_TESTS+=("competitions-service:$test_type")
        print_error "Competitions Service - $test_type: FALHOU"
        return 1
    fi
}

run_notifications_service_tests() {
    local test_type=$1
    local service_dir="$ROOT_DIR/services/notifications-service"
    
    print_section "🔔 Notifications Service - Testes $test_type"
    
    cd "$service_dir"

    if ! command -v poetry &> /dev/null; then
        print_error "Poetry não está instalado"
        return 1
    fi

    if [ ! -d ".venv" ]; then
        print_info "Instalando dependências..."
        poetry install --with dev
    fi

    local pytest_args="-v"
    local test_path=""
    
    case $test_type in
        "unit")
            test_path="tests/unit/"
            pytest_args="$pytest_args --no-cov"
            ;;
        "integration")
            test_path="tests/integration/"
            pytest_args="$pytest_args --no-cov"
            ;;
        "e2e")
            test_path="tests/e2e/"
            pytest_args="$pytest_args --no-cov"
            export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:${TEST_POSTGRES_PORT}/notifications_test"
            ;;
    esac

    if [ "$COVERAGE" = true ]; then
        pytest_args="$pytest_args --cov=src --cov-report=term-missing --cov-report=html"
    fi

    if [ "$VERBOSE" = true ]; then
        pytest_args="$pytest_args -s"
    fi

    # Configura variáveis de ambiente necessárias
    export NOVU_API_KEY="test-api-key"
    export NOVU_APP_ID="test-app-id"

    print_info "Executando: poetry run pytest $test_path $pytest_args"
    
    if poetry run pytest $test_path $pytest_args; then
        TEST_RESULTS+=("notifications-service:$test_type:PASS")
        print_success "Notifications Service - $test_type: OK"
        return 0
    else
        TEST_RESULTS+=("notifications-service:$test_type:FAIL")
        FAILED_TESTS+=("notifications-service:$test_type")
        print_error "Notifications Service - $test_type: FALHOU"
        return 1
    fi
}

run_livestream_service_tests() {
    local test_type=$1
    local service_dir="$ROOT_DIR/services/livestream-service"
    
    print_section "📺 Livestream Service - Testes $test_type"
    
    cd "$service_dir"

    # Verifica se pnpm está instalado
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm não está instalado. Tentando instalar via npm..."
        npm install -g pnpm
    fi

    # Instala dependências se necessário
    if [ ! -d "node_modules" ]; then
        print_info "Instalando dependências..."
        pnpm install
    fi

    local jest_args=""
    
    case $test_type in
        "unit")
            jest_args=""
            ;;
        "integration")
            print_warning "Livestream Service não tem testes de integração separados"
            return 0
            ;;
        "e2e")
            jest_args="--config test/jest-e2e.config.ts"
            export DATABASE_URL="postgresql://postgres:postgres@localhost:${TEST_POSTGRES_PORT}/livestream_test?schema=public"
            export REDIS_HOST="localhost"
            export REDIS_PORT=$TEST_REDIS_PORT
            
            # Cria tabelas usando script customizado (evita problemas de ESM com Prisma CLI)
            print_info "Criando tabelas do banco de dados..."
            DATABASE_URL="postgresql://postgres:postgres@localhost:${TEST_POSTGRES_PORT}/livestream_test" \
                node scripts/setup-test-db.mjs || {
                print_error "Falha ao criar tabelas do banco de dados"
                return 1
            }
            ;;
    esac

    if [ "$COVERAGE" = true ]; then
        jest_args="$jest_args --coverage"
    fi

    if [ "$VERBOSE" = true ]; then
        jest_args="$jest_args --verbose"
    fi

    print_info "Executando: pnpm jest $jest_args"
    
    if pnpm jest $jest_args; then
        TEST_RESULTS+=("livestream-service:$test_type:PASS")
        print_success "Livestream Service - $test_type: OK"
        return 0
    else
        TEST_RESULTS+=("livestream-service:$test_type:FAIL")
        FAILED_TESTS+=("livestream-service:$test_type")
        print_error "Livestream Service - $test_type: FALHOU"
        return 1
    fi
}

run_social_service_tests() {
    local test_type=$1
    local service_dir="$ROOT_DIR/services/social-service"
    
    print_section "👥 Social Service - Testes $test_type"
    
    cd "$service_dir"

    # Verifica se mvn está instalado
    if ! command -v mvn &> /dev/null && ! [ -f "./mvnw" ]; then
        print_error "Maven não está instalado e mvnw não foi encontrado"
        return 1
    fi

    # Define comando Maven (usa wrapper se disponível)
    local maven_cmd="mvn"
    if [ -f "./mvnw" ]; then
        maven_cmd="./mvnw"
        chmod +x ./mvnw
    fi

    # Social Service usa Spring Boot Test, todos os testes são executados juntos
    case $test_type in
        "unit"|"integration"|"e2e")
            # Spring Boot executa todos os testes com mvn test
            print_info "Executando: $maven_cmd test"
            
            if [ "$COVERAGE" = true ]; then
                # Adiciona jacoco para cobertura
                if $maven_cmd test jacoco:report; then
                    TEST_RESULTS+=("social-service:$test_type:PASS")
                    print_success "Social Service - $test_type: OK"
                    return 0
                else
                    TEST_RESULTS+=("social-service:$test_type:FAIL")
                    FAILED_TESTS+=("social-service:$test_type")
                    print_error "Social Service - $test_type: FALHOU"
                    return 1
                fi
            else
                if $maven_cmd test; then
                    TEST_RESULTS+=("social-service:$test_type:PASS")
                    print_success "Social Service - $test_type: OK"
                    return 0
                else
                    TEST_RESULTS+=("social-service:$test_type:FAIL")
                    FAILED_TESTS+=("social-service:$test_type")
                    print_error "Social Service - $test_type: FALHOU"
                    return 1
                fi
            fi
            ;;
    esac
}

# ============================================================================
# Função principal de execução
# ============================================================================

run_tests_for_service() {
    local service=$1
    
    case $service in
        "auth")
            [ "$RUN_UNIT" = true ] && run_auth_service_tests "unit"
            [ "$RUN_INTEGRATION" = true ] && run_auth_service_tests "integration"
            [ "$RUN_E2E" = true ] && run_auth_service_tests "e2e"
            ;;
        "competitions")
            [ "$RUN_UNIT" = true ] && run_competitions_service_tests "unit"
            [ "$RUN_INTEGRATION" = true ] && run_competitions_service_tests "integration"
            [ "$RUN_E2E" = true ] && run_competitions_service_tests "e2e"
            ;;
        "notifications")
            [ "$RUN_UNIT" = true ] && run_notifications_service_tests "unit"
            [ "$RUN_INTEGRATION" = true ] && run_notifications_service_tests "integration"
            [ "$RUN_E2E" = true ] && run_notifications_service_tests "e2e"
            ;;
        "livestream")
            [ "$RUN_UNIT" = true ] && run_livestream_service_tests "unit"
            [ "$RUN_INTEGRATION" = true ] && run_livestream_service_tests "integration"
            [ "$RUN_E2E" = true ] && run_livestream_service_tests "e2e"
            ;;
        "social")
            [ "$RUN_UNIT" = true ] && run_social_service_tests "unit"
            [ "$RUN_INTEGRATION" = true ] && run_social_service_tests "integration"
            [ "$RUN_E2E" = true ] && run_social_service_tests "e2e"
            ;;
        *)
            print_error "Serviço desconhecido: $service"
            return 1
            ;;
    esac
}

print_summary() {
    print_section "📊 Resumo dos Testes"
    
    echo ""
    printf "%-25s %-15s %-10s\n" "SERVIÇO" "TIPO" "STATUS"
    echo "───────────────────────────────────────────────────────"
    
    for result in "${TEST_RESULTS[@]}"; do
        IFS=':' read -r service type status <<< "$result"
        if [ "$status" = "PASS" ]; then
            printf "%-25s %-15s ${GREEN}%-10s${NC}\n" "$service" "$type" "✅ PASS"
        else
            printf "%-25s %-15s ${RED}%-10s${NC}\n" "$service" "$type" "❌ FAIL"
        fi
    done
    
    echo ""
    
    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        print_success "Todos os testes passaram! 🎉"
    else
        print_error "Alguns testes falharam:"
        for failed in "${FAILED_TESTS[@]}"; do
            echo "  - $failed"
        done
    fi
}

# ============================================================================
# Main
# ============================================================================

main() {
    print_banner
    parse_args "$@"
    
    # Mostra configuração
    print_info "Configuração:"
    echo "  - Testes unitários: $([ "$RUN_UNIT" = true ] && echo "Sim" || echo "Não")"
    echo "  - Testes integração: $([ "$RUN_INTEGRATION" = true ] && echo "Sim" || echo "Não")"
    echo "  - Testes E2E: $([ "$RUN_E2E" = true ] && echo "Sim" || echo "Não")"
    echo "  - Cobertura: $([ "$COVERAGE" = true ] && echo "Sim" || echo "Não")"
    [ -n "$SPECIFIC_SERVICE" ] && echo "  - Serviço: $SPECIFIC_SERVICE"
    echo ""

    # Inicia containers se necessário
    if [ "$START_CONTAINERS" = true ] && ([ "$RUN_E2E" = true ] || [ "$RUN_INTEGRATION" = true ]); then
        start_test_containers
    fi

    # Executa os testes
    if [ -n "$SPECIFIC_SERVICE" ]; then
        run_tests_for_service "$SPECIFIC_SERVICE"
    else
        # Executa para todos os serviços
        run_tests_for_service "auth" || true
        run_tests_for_service "competitions" || true
        run_tests_for_service "notifications" || true
        run_tests_for_service "livestream" || true
        run_tests_for_service "social" || true
    fi

    # Imprime resumo
    print_summary

    # Para containers se foram iniciados
    if [ "$START_CONTAINERS" = true ] && ([ "$RUN_E2E" = true ] || [ "$RUN_INTEGRATION" = true ]); then
        stop_test_containers
    fi

    # Retorna código de erro se algum teste falhou
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        exit 1
    fi
}

# Handler de cleanup
trap 'print_warning "Interrompido pelo usuário"; [ "$START_CONTAINERS" = true ] && stop_test_containers; exit 130' INT TERM

# Executa
main "$@"
