# Setup do Ambiente Local

## Pré-requisitos
- Docker e Docker Compose instalados
- Git configurado

## Passo a passo

### 1. Clone o repositório
```bash
git clone <repo-url>
cd athlos-hub
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### 3. Configure cada serviço
```bash
# Auth Service
cp services/auth-service/.env.example services/auth-service/.env

# Competitions Service
cp services/competitions-service/.env.example services/competitions-service/.env

# Edite cada .env.local conforme necessário
```

### 4. Execute o script de setup
```bash
chmod +x scripts/setup-local-db.sh
./scripts/setup-local-db.sh
```

### 5. Rode os serviços
```bash
cd services/auth-service
./rundev.sh
```