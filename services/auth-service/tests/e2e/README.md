# Testes E2E - Auth Service

## Descrição

Estes são **testes End-to-End (E2E) reais** que testam o auth-service 
conectado a um banco de dados PostgreSQL real.

## Diferença entre os tipos de testes

| Tipo | Banco de Dados | O que testa |
|------|---------------|-------------|
| **Unit** (`tests/unit/`) | Mocks | Classes/funções isoladas |
| **Integration** (`tests/routes/`) | SQLite em memória | Componentes + rotas |
| **E2E** (`tests/e2e/`) | PostgreSQL real | Sistema completo |

## Pré-requisitos

### 1. PostgreSQL rodando

```bash
# Usando Docker (porta 5434 para não conflitar)
docker run -d --name postgres-auth-test \
    -p 5434:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=auth_test \
    postgres:15
```

### 2. Variáveis de ambiente

Os testes aceitam várias variáveis (em ordem de prioridade):
- `TEST_DATABASE_URL` (mais específica para testes)
- `E2E_DATABASE_URL`  
- `AUTH_DATABASE_URL` (padrão de produção)

Se nenhuma for definida, usa: `postgresql+asyncpg://postgres:postgres@localhost:5432/auth_test`

```bash
# Exemplo com porta personalizada
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/auth_test"
```

## Executando os testes

### Apenas testes E2E

```bash
cd services/auth-service
poetry run pytest tests/e2e/ -v --no-cov
```

### Com URL personalizada

```bash
TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/auth_test" \
    poetry run pytest tests/e2e/ -v --no-cov
```

### Testes E2E com coverage

```bash
poetry run pytest tests/e2e/ -v --cov=src --cov-report=term-missing
```

### Todos os testes

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
      POSTGRES_DB: auth_test
    ports:
      - 5432:5432
```

## Estrutura dos testes E2E

```
tests/e2e/
├── __init__.py
├── conftest.py               # Fixtures com PostgreSQL real
├── test_health_e2e.py        # Testes de health check (2 testes)
├── test_auth_e2e.py          # Testes de autenticação (16 testes)
├── test_users_e2e.py         # Testes de usuários (7 testes)
└── test_organizations_e2e.py # Testes de organizações (14 testes)
```

## O que os testes E2E validam

### Health Check
- ✅ Endpoint /health retorna status ok
- ✅ Tempo de resposta < 500ms

### Autenticação
- ✅ Validação de campos obrigatórios (login, register)
- ✅ Validação de formato de email
- ✅ Validação de força de senha
- ✅ Tokens de verificação inválidos
- ✅ Refresh token inválido
- ✅ Reset de senha

### Usuários
- ✅ Endpoints protegidos requerem autenticação
- ✅ Token inválido é rejeitado
- ✅ Dados persistidos corretamente no PostgreSQL
- ✅ Isolamento entre usuários

### Organizações
- ✅ Listagem de organizações (com dados reais)
- ✅ Filtros por privacidade (PUBLIC/PRIVATE)
- ✅ Paginação (limit/offset)
- ✅ Busca por slug
- ✅ Criar organização requer autenticação
- ✅ Integridade de dados (owner_id, unicidade de slug)

## Observações sobre Keycloak

Os testes E2E **NÃO** requerem Keycloak rodando. Eles testam:
- Validação de entrada (Pydantic)
- Persistência no PostgreSQL
- Comportamento de endpoints públicos
- Rejeição de tokens inválidos

Para testes com fluxo OAuth completo, seria necessário:
1. Keycloak rodando via Docker
2. Realm configurado
3. Usuário de teste criado

## Limpeza após testes

```bash
# Parar e remover container
docker stop postgres-auth-test
docker rm postgres-auth-test
```
