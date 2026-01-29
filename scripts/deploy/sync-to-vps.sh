#!/bin/bash

###############################################################################
# Script para sincronizar arquivos necessários para a VPS
# 
# Execute este script da sua máquina local
# Ele copia os arquivos necessários para a VPS
###############################################################################

set -e

# Configurações (EDITE AQUI)
VPS_HOST="72.61.24.126"
VPS_USER="gustavoathlos"
VPS_PATH="/home/$VPS_USER/athlos-hub"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Sincronizando arquivos para VPS...${NC}"

# Verificar se está no diretório correto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Execute este script da raiz do projeto!${NC}"
    exit 1
fi

# 1. Sincronizar docker-compose.prod.yml
echo -e "${YELLOW}📤 Copiando docker-compose.prod.yml...${NC}"
scp docker-compose.prod.yml $VPS_USER@$VPS_HOST:$VPS_PATH/

# 2. Sincronizar configuração do Kong
echo -e "${YELLOW}📤 Copiando kong/kong.prod.yml...${NC}"
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH/kong"
scp kong/kong.prod.yml $VPS_USER@$VPS_HOST:$VPS_PATH/kong/

# 3. Sincronizar scripts de inicialização do banco
echo -e "${YELLOW}📤 Copiando scripts de inicialização...${NC}"
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH/scripts/init-databases"
scp scripts/init-databases/init-databases.sh $VPS_USER@$VPS_HOST:$VPS_PATH/scripts/init-databases/

# 4. Verificar se .env existe
echo -e "${YELLOW}🔍 Verificando .env na VPS...${NC}"
if ssh $VPS_USER@$VPS_HOST "[ -f $VPS_PATH/.env ]"; then
    echo -e "${GREEN}✓ .env já existe na VPS${NC}"
else
    echo -e "${YELLOW}⚠️  .env NÃO encontrado na VPS!${NC}"
    echo -e "${YELLOW}   Você precisa criar manualmente:${NC}"
    echo -e "   ssh $VPS_USER@$VPS_HOST"
    echo -e "   cd $VPS_PATH"
    echo -e "   nano .env"
    echo ""
    read -p "Deseja continuar mesmo assim? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. Dar permissões de execução
echo -e "${YELLOW}🔐 Configurando permissões...${NC}"
ssh $VPS_USER@$VPS_HOST "chmod +x $VPS_PATH/scripts/init-databases/init-databases.sh"

# 6. Resumo
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Sincronização concluída!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📁 Arquivos copiados para:${NC} $VPS_USER@$VPS_HOST:$VPS_PATH"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo ""
echo "1. Conectar na VPS:"
echo "   ssh $VPS_USER@$VPS_HOST"
echo ""
echo "2. Navegar até o diretório:"
echo "   cd $VPS_PATH"
echo ""
echo "3. Criar/editar .env (se ainda não existe):"
echo "   nano .env"
echo ""
echo "4. Fazer primeiro deploy manual:"
echo "   docker-compose -f docker-compose.prod.yml pull"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Verificar logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${GREEN}🎉 VPS pronta para deploy!${NC}"
