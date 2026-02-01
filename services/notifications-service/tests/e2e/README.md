# Testes E2E - Notifications Service

## Descrição

Estes são **testes End-to-End (E2E) reais** que testam o serviço de notificações 
conectado a um banco de dados PostgreSQL real.

## Diferença entre os tipos de testes

| Tipo | Banco de Dados | O que testa |
|------|---------------|-------------|
| **Unit** (`tests/unit/`) | Mocks | Classes/funções isoladas |
| **Integration** (`tests/integration/`) | SQLite em memória | Componentes + rotas |
| **E2E** (`tests/e2e/`) | PostgreSQL real | Sistema completo |

## Pré-requisitos

### 1. PostgreSQL rodando

```bash
# Usando Docker (porta padrão 5432)
docker run -d --name postgres-notifications-test \
    -p 5432:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=notifications_test \
    postgres:15

# Ou em outra porta (ex: 5433)
docker run -d --name postgres-notifications-test \
    -p 5433:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=notifications_test \
    postgres:15
```

### 2. Variáveis de ambiente

Os testes aceitam várias variáveis (em ordem de prioridade):
- `TEST_DATABASE_URL` (mais específica para testes)
- `E2E_DATABASE_URL`  
- `DATABASE_URL` (padrão de produção)

Se nenhuma for definida, usa: `postgresql+asyncpg://postgres:postgres@localhost:5432/notifications_test`

```bash
# Exemplo com porta personalizada
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/notifications_test"
```

## Executando os testes

### Apenas testes E2E

```bash
cd services/notifications-service
poetry run pytest tests/e2e/ -v --no-cov
```

### Com URL personalizada

```bash
TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/notifications_test" \
    poetry run pytest tests/e2e/ -v --no-cov
```

### Testes E2E com coverage

```bash
poetry run pytest tests/e2e/ -v --cov=src --cov-report=term-missing
```

### Todos os testes (unit + integration + e2e)

```bash
poetry run pytest -v
```

## Na Pipeline CI/CD

Os testes E2E são executados na pipeline do GitHub Actions usando **services**:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: notifications_test
    ports:
      - 5432:5432
```

## Estrutura dos testes E2E

```
tests/e2e/
├── __init__.py
├── conftest.py              # Fixtures com PostgreSQL real
├── test_health_e2e.py       # Testes de health check (3 testes)
└── test_notifications_e2e.py # Testes de CRUD de notificações (22 testes)
```

## O que os testes E2E validam

- ✅ Conexão real com PostgreSQL
- ✅ Criação automática de tabelas (DDL)
- ✅ Operações CRUD completas
- ✅ Paginação com dados reais (15 itens, 3 páginas)
- ✅ Isolamento entre usuários
- ✅ Autenticação via header X-User-Id
- ✅ Integridade de dados
- ✅ Performance (tempo de resposta < 500ms)

## Limpeza após testes

```bash
# Parar e remover container
docker stop postgres-notifications-test
docker rm postgres-notifications-test
```
