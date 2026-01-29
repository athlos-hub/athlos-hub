# 🚀 Deploy AthlosHub - Guia Completo

## 📖 Introdução

Este repositório está configurado com **CI/CD automatizado** usando GitHub Actions para fazer deploy na VPS da Hostinger.

### Como Funciona?

```
1. Você faz commit e push no GitHub
   ↓
2. GitHub Actions:
   - Faz build das imagens Docker
   - Envia para GitHub Container Registry
   ↓
3. Deploy automático na VPS:
   - Faz backup do banco de dados
   - Baixa as novas imagens
   - Reinicia os serviços
   ↓
4. ✅ Aplicação atualizada em http://athloshub.com.br
```

## 🎯 Quick Start (Resumo de 5 Minutos)

### 1. Preparar VPS (Fazer UMA VEZ)

```bash
# Na VPS via SSH
curl -O https://raw.githubusercontent.com/seu-usuario/athlos-hub/main/scripts/deploy/setup-vps.sh
sudo bash setup-vps.sh
exit && ssh seu-usuario@seu-ip  # Relogar
```

### 2. Copiar Arquivos

```bash
# Na sua máquina local
# Editar scripts/deploy/sync-to-vps.sh com suas credenciais
bash scripts/deploy/sync-to-vps.sh
```

### 3. Configurar .env na VPS

```bash
# Na VPS
cd /home/seu-usuario/athloshub
nano .env
# Colar template de docs/ENV_PRODUCTION_TEMPLATE.md
```

### 4. Configurar GitHub Secrets

No GitHub: `Settings` → `Secrets and variables` → `Actions`

Adicionar:
- `VPS_HOST` - IP da sua VPS
- `VPS_USERNAME` - Usuário SSH
- `VPS_SSH_KEY` - Chave privada SSH (gerada com ssh-keygen)

### 5. Deploy!

```bash
# Na sua máquina
git push origin main

# Acompanhe em: GitHub → Actions
# Aguarde ~10-15 minutos
# Acesse: http://athloshub.com.br
```

## 📚 Documentação Detalhada

### Guias Completos:

1. **[QUICK_START_DEPLOY.md](docs/QUICK_START_DEPLOY.md)**
   - Guia passo-a-passo detalhado
   - Inclui troubleshooting
   - Comandos de monitoramento

2. **[DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)**
   - Guia completo de deploy
   - Arquitetura do sistema
   - Segurança e melhores práticas

3. **[UNDERSTANDING_DOCKER_BUILD.md](docs/UNDERSTANDING_DOCKER_BUILD.md)**
   - Como funciona o Docker
   - Build vs Pull
   - Por que usar Registry

4. **[ENV_PRODUCTION_TEMPLATE.md](docs/ENV_PRODUCTION_TEMPLATE.md)**
   - Template completo do .env
   - Como gerar senhas seguras

## 🛠️ Arquivos Importantes

### Docker Compose

- **`docker-compose.prod.yml`** - Build local (desenvolvimento)
- **`docker-compose.registry.yml`** - Pull do registry (produção/CI/CD)

### Scripts

- **`scripts/deploy/setup-vps.sh`** - Prepara VPS (Docker, firewall, etc)
- **`scripts/deploy/sync-to-vps.sh`** - Sincroniza arquivos para VPS
- **`scripts/deploy/first-deploy.sh`** - Primeiro deploy manual na VPS

### GitHub Actions

- **`.github/workflows/deploy-production.yml`** - CI/CD automático

## 🔄 Workflow de Desenvolvimento

### 1. Desenvolvimento Local

```bash
# Desenvolver localmente
npm run dev  # ou docker-compose up

# Testar mudanças
git add .
git commit -m "feat: nova funcionalidade"
```

### 2. Build e Test Local (Opcional)

```bash
# Testar build de produção localmente
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Testar
curl http://localhost

# Parar
docker-compose -f docker-compose.prod.yml down
```

### 3. Deploy para Produção

```bash
# Simplesmente push!
git push origin main

# GitHub Actions faz automaticamente:
# ✅ Build de todas as imagens
# ✅ Push para ghcr.io
# ✅ Deploy na VPS
# ✅ Health checks
```

### 4. Monitorar Deploy

```
GitHub → Actions → Ver workflow rodando

Ou na VPS:
ssh seu-usuario@seu-ip
docker-compose -f docker-compose.registry.yml logs -f
```

## 📊 Estrutura de Imagens

Todas as imagens são armazenadas em:
```
ghcr.io/seu-usuario/athlos-frontend:latest
ghcr.io/seu-usuario/athlos-auth-service:latest
ghcr.io/seu-usuario/athlos-competitions-service:latest
ghcr.io/seu-usuario/athlos-livestream-service:latest
ghcr.io/seu-usuario/athlos-notifications-service:latest
```

## 🔐 Secrets Necessários

### GitHub Actions Secrets:

| Secret | Descrição | Como Obter |
|--------|-----------|------------|
| `VPS_HOST` | IP ou domínio da VPS | IP da Hostinger |
| `VPS_USERNAME` | Usuário SSH | Seu usuário |
| `VPS_SSH_KEY` | Chave privada SSH | `ssh-keygen` |
| `GITHUB_TOKEN` | Token GitHub | Automático (já existe) |

### Variáveis de Ambiente (.env na VPS):

Ver template completo em: [ENV_PRODUCTION_TEMPLATE.md](docs/ENV_PRODUCTION_TEMPLATE.md)

Principais:
- Senhas do PostgreSQL
- NEXTAUTH_SECRET
- Credenciais do Keycloak
- URLs públicas (http://athloshub.com.br)

## 🧪 Testes e Verificação

### Após Deploy, Verificar:

```bash
# 1. Status dos containers
docker ps

# 2. Logs
docker-compose -f docker-compose.registry.yml logs -f

# 3. Endpoints
curl http://athloshub.com.br
curl http://athloshub.com.br/api/v1/health

# 4. Health checks
docker inspect --format='{{.State.Health.Status}}' athlos_frontend
```

### Checklist de Sucesso:

- [ ] Todos containers rodando (`docker ps`)
- [ ] Frontend acessível
- [ ] API respondendo (/health)
- [ ] Login funcionando
- [ ] Notificações em tempo real (SSE)
- [ ] Livestream funcionando
- [ ] Sem erros nos logs

## 🔧 Comandos Úteis

### Monitoramento:

```bash
# Ver logs em tempo real
docker-compose -f docker-compose.registry.yml logs -f [serviço]

# Ver uso de recursos
docker stats

# Ver status
docker-compose -f docker-compose.registry.yml ps
```

### Manutenção:

```bash
# Restart de um serviço
docker-compose -f docker-compose.registry.yml restart frontend

# Restart completo
docker-compose -f docker-compose.registry.yml down
docker-compose -f docker-compose.registry.yml up -d

# Limpar imagens antigas
docker system prune -a
```

### Backup:

```bash
# Backup manual
bash scripts/backup.sh

# Ver backups
ls -lh backups/
```

## 🆘 Troubleshooting

### Deploy Falhou no GitHub Actions

```bash
# Ver logs detalhados
GitHub → Actions → Workflow falhado → Ver logs

# Causas comuns:
- Secrets não configurados
- Erro de build
- VPS inacessível via SSH
```

### Container não inicia

```bash
# Ver logs
docker logs athlos_nome_servico

# Verificar .env
cat .env | grep VARIAVEL

# Verificar imagem
docker images | grep athlos
```

### Erro "Cannot connect to the Docker daemon"

```bash
# Verificar se Docker está rodando
sudo systemctl status docker

# Iniciar Docker
sudo systemctl start docker

# Verificar permissões
sudo usermod -aG docker $USER
# Relogar
```

## 📞 Suporte

### Logs Úteis:

```bash
# Kong (gateway)
docker logs athlos_kong_gateway -f

# Frontend
docker logs athlos_frontend -f

# Auth Service
docker logs athlos_auth_service -f

# PostgreSQL
docker logs athlos_postgres -f
```

### Rollback para Versão Anterior:

```bash
# Ver tags disponíveis
docker images ghcr.io/seu-usuario/athlos-frontend

# Pull versão anterior
docker pull ghcr.io/seu-usuario/athlos-frontend:main-abc123

# Restart
docker-compose -f docker-compose.registry.yml up -d
```

## 🎉 Próximos Passos

Após deploy bem-sucedido:

1. **SSL/TLS** - Configurar HTTPS com Certbot
2. **Monitoring** - Prometheus + Grafana
3. **Logs** - Centralizar logs (ELK ou Loki)
4. **Alertas** - Discord/Slack para erros
5. **CDN** - Cloudflare para cache
6. **Backups** - Backup remoto (S3, etc)

## 📖 Recursos

- [Documentação Docker](https://docs.docker.com/)
- [GitHub Actions](https://docs.github.com/actions)
- [Docker Compose](https://docs.docker.com/compose/)
- [Kong Gateway](https://docs.konghq.com/)

---

**Desenvolvido com ❤️ para AthlosHub**

Domínio: http://athloshub.com.br
