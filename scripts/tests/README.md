# 🧪 Athlos Hub - Scripts de Testes

Este diretório contém scripts para executar os testes de todos os serviços do Athlos Hub.

## Estrutura

```
scripts/tests/
├── run-all-tests.sh        # Script principal com todas as opções
├── run-unit-tests.sh       # Apenas testes unitários (rápido, sem containers)
├── run-e2e-tests.sh        # Apenas testes E2E (requer containers)
├── init-test-databases.sql # SQL de inicialização dos databases de teste
└── README.md               # Esta documentação
```

## Pré-requisitos

### Para testes unitários
- Python 3.12+
- Poetry
- Node.js 20+
- pnpm

### Para testes E2E / Integração
- Docker
- Docker Compose
- Todos os requisitos dos testes unitários

## Uso Rápido

### Executar apenas testes unitários (sem containers)

```bash
./scripts/tests/run-unit-tests.sh
```

### Executar todos os testes

```bash
./scripts/tests/run-all-tests.sh
```

### Executar apenas testes E2E

```bash
./scripts/tests/run-e2e-tests.sh
```

## Script Principal (run-all-tests.sh)

O script principal oferece várias opções para customização:

### Opções

| Opção | Descrição |
|-------|-----------|
| `--unit` | Executa apenas testes unitários |
| `--integration` | Executa apenas testes de integração |
| `--e2e` | Executa apenas testes E2E |
| `--all` | Executa todos os testes (padrão) |
| `--service <nome>` | Executa testes de um serviço específico |
| `--no-containers` | Não inicia/para containers (usa existentes) |
| `--coverage` | Gera relatório de cobertura |
| `--verbose` | Saída detalhada |
| `--help` | Mostra ajuda |

### Serviços disponíveis

- `auth` - Auth Service (Python/FastAPI)
- `competitions` - Competitions Service (Python/FastAPI)
- `notifications` - Notifications Service (Python/FastAPI)
- `livestream` - Livestream Service (Node.js/NestJS)

### Exemplos

```bash
# Testes unitários de todos os serviços
./scripts/tests/run-all-tests.sh --unit

# Testes E2E do auth service
./scripts/tests/run-all-tests.sh --e2e --service auth

# Todos os testes com cobertura
./scripts/tests/run-all-tests.sh --all --coverage

# Testes usando containers já existentes
./scripts/tests/run-all-tests.sh --e2e --no-containers
```

## Docker Compose para Testes

Um arquivo `docker-compose.test.yml` está disponível na raiz do projeto:

```bash
# Subir containers de teste manualmente
docker compose -f docker-compose.test.yml up -d

# Parar containers
docker compose -f docker-compose.test.yml down
```

### Containers criados

| Container | Porta | Descrição |
|-----------|-------|-----------|
| `athlos_postgres_test` | 5433 | PostgreSQL para testes |
| `athlos_redis_test` | 6380 | Redis para testes |

### Databases criados automaticamente

- `auth_test`
- `competitions_test`
- `notifications_test`
- `livestream_test`

## Estrutura de Testes por Serviço

### Auth Service (`services/auth-service/tests/`)
- `unit/` - Testes unitários (mocks, SQLite em memória)
- `routes/` - Testes de integração de rotas
- `e2e/` - Testes end-to-end (PostgreSQL real)

### Competitions Service (`services/competitions-service/tests/`)
- `unit/` - Testes unitários
- `routes/` - Testes de integração de rotas

### Notifications Service (`services/notifications-service/tests/`)
- `unit/` - Testes unitários
- `integration/` - Testes de integração (SQLite em memória)
- `e2e/` - Testes end-to-end (PostgreSQL real)

### Livestream Service (`services/livestream-service/`)
- `src/**/__tests__/` - Testes unitários (Jest)
- `test/` - Testes E2E (PostgreSQL + Redis reais)

## Variáveis de Ambiente

Os scripts configuram automaticamente as variáveis necessárias:

```bash
# Testes E2E
TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/<db_name>
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/<db_name>
REDIS_HOST=localhost
REDIS_PORT=6380

# Notifications Service
NOVU_API_KEY=test-api-key
NOVU_APP_ID=test-app-id
```

## CI/CD

Para uso em pipelines CI/CD, recomenda-se:

```yaml
# Exemplo GitHub Actions
- name: Run unit tests
  run: ./scripts/tests/run-unit-tests.sh

- name: Start test containers
  run: docker compose -f docker-compose.test.yml up -d

- name: Run E2E tests
  run: ./scripts/tests/run-e2e-tests.sh

- name: Cleanup
  run: docker compose -f docker-compose.test.yml down
```

## Troubleshooting

### Containers não iniciam
```bash
# Limpar containers antigos
docker rm -f athlos_postgres_test athlos_redis_test

# Tentar novamente
./scripts/tests/run-e2e-tests.sh
```

### Erro de permissão nos scripts
```bash
chmod +x scripts/tests/*.sh
```

### Poetry/pnpm não encontrado
```bash
# Instalar Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Instalar pnpm
npm install -g pnpm
```

### Testes falhando por timeout
Aumente o timeout do pytest ou jest:
```bash
# pytest
poetry run pytest tests/e2e/ -v --timeout=60

# jest
pnpm jest --testTimeout=30000
```
