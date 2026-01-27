# 🚀 Guia de Inicialização - Projeto AthlosHub

Este guia descreve os passos necessários para levantar o ambiente de desenvolvimento e produção, configurar o serviço de autenticação e iniciar os microsserviços.

## 🛠 Pré-requisitos

* Docker e Docker Compose
* Python com [Poetry](https://python-poetry.org/)
* Node.js com [pnpm](https://pnpm.io/)

---

## Substituir Credenciais do Google OAuth

1. Entre no keycloak_backup.sql
2. Substitua "GOOGLE_CLIENT_ID_AQUI" pelo CLIENT_ID real sem aspas
3. Substitua "GOOGLE_CLIENT_SECRET_AQUI" pelo CLIENT_SECRET real sem aspas

## 🏗 Ambientes Docker

### Produção (`docker-compose.prod.yml`)

Use este comando para um deploy limpo utilizando variáveis de ambiente de produção.

```bash
# 1. Build das imagens sem cache
docker compose --env-file .env.production -f docker-compose.prod.yml build --no-cache

# 2. Iniciar banco de dados
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres

# 3. Restaurar backup do banco
docker exec -i athlos_postgres psql -U keycloak -d keycloak_db < keycloak_backup.sql

# 4. Subir todos os serviços
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

```

### Local (`docker-compose-local.yml`)

Ideal para desenvolvimento diário.

```bash
# 1. Subir banco local
docker compose -f docker-compose-local.yml up -d postgres-local

# 2. Restaurar backup
docker exec -i sports_postgres_local psql -U keycloak -d keycloak_db < keycloak_backup.sql

# 3. Subir demais dependências
docker compose -f docker-compose-local.yml up -d

```

---

## 🔐 Configuração do Keycloak

Após subir os containers, é necessário configurar o client no painel administrativo:

1. **Acesse:** [http://localhost:8100/keycloak/admin/](https://www.google.com/search?q=http://localhost:8100/keycloak/admin/)
2. **Navegue até:** `Realm athlos` > `Clients` > `Settings`
3. **Atualize os campos conforme a tabela:**

| Campo | Valor |
| --- | --- |
| **Root URL** | `http://localhost:3000` |
| **Valid redirect URIs** | `http://localhost:3000/auth/callback`, `http://localhost:3000/*` |
| **Valid post logout redirect URIs** | `http://localhost:3000` |
| **Web origins** | `http://localhost:3000` |
| **Admin URL** | `http://localhost:3000` |

4. Clique em **Save** no final da página.

---

## 🔌 Como Subir os Microsserviços Localmente

Siga a ordem abaixo para garantir que os bancos de dados estejam migrados antes da execução.

### 1. Auth Service

```bash
cd services/auth-service
poetry env activate
source [caminho do poetry acima]
poetry install
alembic upgrade head
./rundev.sh

```

### 2. Notifications Service

```bash
cd services/notifications-service
poetry env activate
source [caminho do poetry acima]
alembic upgrade head
./rundev.sh

```

### 3. Livestream Service

```bash
cd services/livestream-service
pnpm install
npx prisma db push
pnpm run start:dev

```

---

> **💡 Nota:** Certifique-se de que as portas `8100` (Keycloak) e `3000` (Frontend) não estejam ocupadas por outros serviços antes de iniciar.
