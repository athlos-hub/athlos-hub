#!/bin/bash

###############################################################################
# Script de Setup Inicial da VPS para AthlosHub
# 
# Este script prepara a VPS da Hostinger para receber a aplicação
# Execute apenas UMA VEZ na VPS nova
###############################################################################

set -e

echo "🚀 Iniciando setup da VPS para AthlosHub..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Execute como root: sudo bash setup-vps.sh${NC}"
  exit 1
fi

# Obter usuário não-root
ACTUAL_USER=${SUDO_USER:-$USER}
echo -e "${GREEN}✓ Usuário: $ACTUAL_USER${NC}"

# 1. Atualizar sistema
echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
apt-get update
apt-get upgrade -y

# 2. Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    vim \
    htop \
    net-tools

# 3. Instalar Docker
echo -e "${YELLOW}🐳 Instalando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Adicionar usuário ao grupo docker
    usermod -aG docker $ACTUAL_USER
    echo -e "${GREEN}✓ Docker instalado!${NC}"
else
    echo -e "${GREEN}✓ Docker já instalado${NC}"
fi

# 4. Instalar Docker Compose
echo -e "${YELLOW}🐳 Instalando Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION="v2.24.0"
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose instalado!${NC}"
else
    echo -e "${GREEN}✓ Docker Compose já instalado${NC}"
fi

# 5. Configurar firewall
echo -e "${YELLOW}🔥 Configurando firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS (futuro)
    ufw status
    echo -e "${GREEN}✓ Firewall configurado!${NC}"
else
    echo -e "${YELLOW}⚠️  UFW não encontrado, pule esta etapa${NC}"
fi

# 6. Criar estrutura de diretórios
echo -e "${YELLOW}📁 Criando estrutura de diretórios...${NC}"
mkdir -p /home/$ACTUAL_USER/athloshub/{backups,kong,scripts/init-databases}
chown -R $ACTUAL_USER:$ACTUAL_USER /home/$ACTUAL_USER/athloshub

# 7. Configurar swap (se necessário)
if [ $(free -m | awk '/^Swap:/ {print $2}') -eq 0 ]; then
    echo -e "${YELLOW}💾 Criando arquivo de swap (2GB)...${NC}"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo -e "${GREEN}✓ Swap criado!${NC}"
else
    echo -e "${GREEN}✓ Swap já configurado${NC}"
fi

# 8. Configurar limites do Docker
echo -e "${YELLOW}⚙️  Configurando limites do Docker...${NC}"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

# Reiniciar Docker
systemctl restart docker
echo -e "${GREEN}✓ Docker configurado!${NC}"

# 9. Criar script de backup
echo -e "${YELLOW}💾 Criando script de backup...${NC}"
cat > /home/$ACTUAL_USER/athloshub/scripts/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/$(whoami)/athloshub/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "📦 Criando backup em $BACKUP_DIR..."

# Backup completo de todos os bancos
docker exec athlos_postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/full_backup_$DATE.sql.gz"

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup concluído: full_backup_$DATE.sql.gz"
EOF

chmod +x /home/$ACTUAL_USER/athloshub/scripts/backup.sh
chown $ACTUAL_USER:$ACTUAL_USER /home/$ACTUAL_USER/athloshub/scripts/backup.sh

# 10. Configurar cron para backup diário
echo -e "${YELLOW}⏰ Configurando backup automático...${NC}"
(crontab -u $ACTUAL_USER -l 2>/dev/null; echo "0 3 * * * /home/$ACTUAL_USER/athloshub/scripts/backup.sh >> /home/$ACTUAL_USER/athloshub/backup.log 2>&1") | crontab -u $ACTUAL_USER -

# 11. Informações finais
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup da VPS concluído com sucesso!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo ""
echo "1. Fazer logout e login novamente para aplicar grupo docker:"
echo "   exit"
echo ""
echo "2. Copiar arquivos necessários para a VPS:"
echo "   - docker-compose.prod.yml"
echo "   - kong/kong.prod.yml"
echo "   - scripts/init-databases/init-databases.sh"
echo ""
echo "3. Criar arquivo .env com as variáveis de ambiente"
echo ""
echo "4. Configurar secrets no GitHub Actions"
echo ""
echo "5. Fazer push para main branch para deploy automático"
echo ""
echo -e "${YELLOW}📁 Estrutura criada em:${NC}"
echo "   /home/$ACTUAL_USER/athloshub/"
echo ""
echo -e "${YELLOW}🔍 Verificar instalação:${NC}"
echo "   docker --version"
echo "   docker-compose --version"
echo ""
echo -e "${YELLOW}💾 Backup automático configurado:${NC}"
echo "   Todo dia às 3h da manhã"
echo "   Logs em: /home/$ACTUAL_USER/athloshub/backup.log"
echo ""
echo -e "${GREEN}🎉 VPS pronta para receber a aplicação!${NC}"
