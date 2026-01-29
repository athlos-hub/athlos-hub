#!/bin/bash

###############################################################################
# Script de Primeiro Deploy na VPS
# 
# Execute este script NA VPS após copiar os arquivos
# cd /home/seu-usuario/athloshub
# bash scripts/first-deploy.sh
###############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   🚀 PRIMEIRO DEPLOY - ATHLOSHUB   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se está no diretório correto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml não encontrado!${NC}"
    echo -e "${YELLOW}Execute este script da pasta /home/seu-usuario/athloshub${NC}"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo ""
    echo -e "${YELLOW}Crie o arquivo .env com base no .env.production.example:${NC}"
    echo "cp .env.production.example .env"
    echo "nano .env"
    echo ""
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando!${NC}"
    echo "sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✓ Pré-requisitos verificados!${NC}"
echo ""

# Login no GitHub Container Registry
echo -e "${YELLOW}🔐 Login no GitHub Container Registry...${NC}"
echo "Digite seu GitHub username:"
read GITHUB_USERNAME
echo "Digite seu GitHub Personal Access Token:"
read -s GITHUB_TOKEN
echo ""

echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Falha no login! Verifique suas credenciais.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login realizado com sucesso!${NC}"
echo ""

# Pull das imagens
echo -e "${YELLOW}📥 Fazendo pull das imagens Docker...${NC}"
echo -e "${BLUE}Isso pode levar alguns minutos...${NC}"
docker-compose -f docker-compose.prod.yml pull

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Falha ao fazer pull das imagens!${NC}"
    echo -e "${YELLOW}Certifique-se de que:${NC}"
    echo "1. As imagens foram buildadas e pushed para o registry"
    echo "2. Seu token tem permissão de leitura de packages"
    echo "3. O nome das imagens está correto no docker-compose.prod.yml"
    exit 1
fi

echo -e "${GREEN}✓ Pull concluído!${NC}"
echo ""

# Criar rede Docker (se não existir)
echo -e "${YELLOW}🌐 Criando rede Docker...${NC}"
docker network create athlos-network 2>/dev/null || true
echo -e "${GREEN}✓ Rede criada!${NC}"
echo ""

# Iniciar serviços
echo -e "${YELLOW}🚀 Iniciando serviços...${NC}"
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Falha ao iniciar serviços!${NC}"
    echo "Verifique os logs:"
    echo "docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

echo -e "${GREEN}✓ Serviços iniciados!${NC}"
echo ""

# Aguardar serviços ficarem prontos
echo -e "${YELLOW}⏳ Aguardando serviços ficarem prontos (30s)...${NC}"
sleep 30

# Verificar status
echo ""
echo -e "${YELLOW}📊 Status dos containers:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Health checks
echo ""
echo -e "${YELLOW}🔍 Verificando health dos serviços...${NC}"
echo ""

check_health() {
    SERVICE=$1
    CONTAINER=$2
    
    if docker ps | grep -q "$CONTAINER.*Up"; then
        echo -e "${GREEN}✓${NC} $SERVICE está rodando"
        return 0
    else
        echo -e "${RED}✗${NC} $SERVICE NÃO está rodando"
        return 1
    fi
}

HEALTHY=true

check_health "PostgreSQL" "athlos_postgres" || HEALTHY=false
check_health "Kong Gateway" "athlos_kong_gateway" || HEALTHY=false
check_health "Auth Service" "athlos_auth_service" || HEALTHY=false
check_health "Competitions Service" "athlos_competitions_service" || HEALTHY=false
check_health "Livestream Service" "athlos_livestream_service" || HEALTHY=false
check_health "Notifications Service" "athlos_notifications_service" || HEALTHY=false
check_health "Frontend" "athlos_frontend" || HEALTHY=false
check_health "MediaMTX" "athlos_mediamtx" || HEALTHY=false

echo ""

if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ DEPLOY CONCLUÍDO COM SUCESSO!   ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}🌐 Acesse sua aplicação em:${NC}"
    echo "   http://athloshub.com.br"
    echo ""
    echo -e "${YELLOW}📊 Monitoramento:${NC}"
    echo "   docker-compose -f docker-compose.prod.yml ps"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo -e "${YELLOW}🔄 Restart de um serviço:${NC}"
    echo "   docker-compose -f docker-compose.prod.yml restart [serviço]"
    echo ""
    echo -e "${YELLOW}📁 Backups:${NC}"
    echo "   Backup automático configurado para rodar diariamente às 3h"
    echo "   Backups salvos em: $(pwd)/backups/"
    echo ""
else
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}   ⚠️  ALGUNS SERVIÇOS NÃO INICIARAM   ${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Verifique os logs dos serviços com problema:${NC}"
    echo "docker-compose -f docker-compose.prod.yml logs [nome-do-serviço]"
    echo ""
    echo -e "${YELLOW}Exemplo:${NC}"
    echo "docker-compose -f docker-compose.prod.yml logs frontend"
    echo "docker-compose -f docker-compose.prod.yml logs auth-service"
    echo ""
fi

# Mostrar uso de recursos
echo -e "${YELLOW}💻 Uso de recursos:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep athlos
echo ""

echo -e "${BLUE}💡 Dica: Para acompanhar os logs em tempo real:${NC}"
echo "docker-compose -f docker-compose.prod.yml logs -f"
