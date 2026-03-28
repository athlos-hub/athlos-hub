# Análise Completa: Notificações para Sistema de Organizações

## 📊 Resumo Executivo

Analisei todo o `OrganizationService` do auth-service (37 métodos) e identifiquei **15 ações que REALMENTE precisam** de notificações baseado em:
- ✅ Impacto direto no usuário
- ✅ Ação realizada por outro usuário (necessita comunicação)
- ✅ Mudança de estado importante
- ✅ Requer atenção ou ação do usuário

## 🎯 Notificações ESSENCIAIS (Prioridade Alta)

### 1. Sistema de Convites
#### ✅ **JÁ IMPLEMENTADO**
- [x] `invite_user()` - Quando alguém convida você para uma organização
- [x] `accept_invite()` - Quando alguém aceita seu convite

#### 🔴 **FALTA IMPLEMENTAR**
| Método | Quando | Para Quem | Tipo | Mensagem |
|--------|--------|-----------|------|----------|
| `cancel_invite()` | Admin cancela convite enviado | Usuário convidado | `organization_invite_cancelled` | "O convite para {org_name} foi cancelado" |
| `decline_invite()` | Usuário recusa convite | Owner/Organizer que convidou | `organization_invite_declined` | "{user_name} recusou o convite para {org_name}" |

---

### 2. Sistema de Solicitações de Entrada
| Método | Quando | Para Quem | Tipo | Mensagem |
|--------|--------|-----------|------|----------|
| `request_to_join()` | Usuário solicita entrar | Owner e Organizers | `organization_join_request` | "{user_name} solicitou entrar em {org_name}" |
| `approve_join_request()` | Admin aprova solicitação | Usuário solicitante | `organization_request_approved` | "Sua solicitação para entrar em {org_name} foi aprovada!" |
| `reject_join_request()` | Admin rejeita solicitação | Usuário solicitante | `organization_request_rejected` | "Sua solicitação para entrar em {org_name} foi rejeitada" |
| `cancel_join_request()` | Usuário cancela própria solicitação | ❌ Não notifica (ação própria) | - | - |

---

### 3. Gerenciamento de Membros
| Método | Quando | Para Quem | Tipo | Mensagem |
|--------|--------|-----------|------|----------|
| `remove_member()` | Admin remove membro | Usuário removido | `organization_member_removed` | "Você foi removido da organização {org_name}" |
| `leave_organization()` | Membro sai | Owner e Organizers | `organization_member_left` | "{user_name} saiu da organização {org_name}" |

---

### 4. Gerenciamento de Organizers (Administradores)
| Método | Quando | Para Quem | Tipo | Mensagem |
|--------|--------|-----------|------|----------|
| `add_organizer()` | Owner promove membro | Usuário promovido | `organization_organizer_added` | "Você foi promovido a organizador de {org_name}" |
| `remove_organizer()` | Owner remove organizer | Usuário despromovido | `organization_organizer_removed` | "Você não é mais organizador de {org_name}" |

---

### 5. Transferência de Propriedade
| Método | Quando | Para Quem | Tipo | Mensagem |
|--------|--------|-----------|------|----------|
| `transfer_ownership()` | Owner transfere propriedade | **2 notificações:** | | |
| | | 1. Novo owner | `organization_ownership_received` | "Você agora é o proprietário de {org_name}" |
| | | 2. Antigo owner | `organization_ownership_transferred` | "A propriedade de {org_name} foi transferida para {new_owner_name}" |

---

### 6. Ações Administrativas (Plataforma)
| Método | Quando | Para Quem | Tipo | Mensagem |
|--------|--------|-----------|------|----------|
| `admin_accept_organization()` | Admin aceita org pendente | Owner da organização | `organization_approved` | "Sua organização {org_name} foi aprovada pela plataforma!" |
| `admin_suspend_organization()` | Admin suspende organização | Owner + Organizers | `organization_suspended` | "A organização {org_name} foi suspensa pela plataforma" |
| `admin_unsuspend_organization()` | Admin reativa organização | Owner + Organizers | `organization_unsuspended` | "A organização {org_name} foi reativada!" |
| `admin_delete_organization()` | Admin exclui/rejeita org | Owner + todos membros ativos | `organization_deleted` | "A organização {org_name} foi {excluded/rejected} pela plataforma" |

---

## ❌ Notificações NÃO NECESSÁRIAS (Ações próprias ou consultas)

### Ações do Próprio Usuário (Não notifica)
- `create_organization()` - Criou você mesmo
- `update_organization()` - Atualizou você mesmo
- `delete_organization_by_owner()` - Deletou você mesmo
- `update_join_policy()` - Configuração própria
- `join_via_link()` - Entrou por link (já é membro)

### Métodos de Consulta (Não geram eventos)
- `get_organization_by_slug()`
- `get_organizations()`
- `get_user_organizations()`
- `get_pending_requests()`
- `get_sent_invites()`
- `get_user_invites()`
- `get_user_requests()`
- `get_members()`
- `get_organizers()`
- `get_team_overview()`
- `get_all_organizations_admin()`
- `get_user_role_in_org()`

---

## 📋 Resumo por Prioridade

### 🔴 **PRIORIDADE ALTA** (Impacto crítico no usuário)
1. ✅ `invite_user()` - JÁ FEITO
2. ✅ `accept_invite()` - JÁ FEITO
3. `request_to_join()` - Solicitação de entrada
4. `approve_join_request()` - Aprovação de solicitação
5. `reject_join_request()` - Rejeição de solicitação
6. `remove_member()` - Remoção de membro
7. `transfer_ownership()` - Transferência de propriedade

### 🟡 **PRIORIDADE MÉDIA** (Importante mas não urgente)
8. `add_organizer()` - Promoção a organizador
9. `remove_organizer()` - Remoção de organizador
10. `leave_organization()` - Membro saiu
11. `decline_invite()` - Convite recusado
12. `cancel_invite()` - Convite cancelado

### 🟢 **PRIORIDADE BAIXA** (Administrativo)
13. `admin_accept_organization()` - Aprovação pela plataforma
14. `admin_suspend_organization()` - Suspensão
15. `admin_unsuspend_organization()` - Reativação
16. `admin_delete_organization()` - Exclusão/Rejeição

---

## 🎨 Tipos de Notificação a Criar

```python
# Adicionar ao NotificationType enum no notifications-service
class NotificationType(str, Enum):
    # Já existem:
    ORGANIZATION_INVITE = "organization_invite"
    ORGANIZATION_ACCEPTED = "organization_accepted"
    
    # Novos (Convites):
    ORGANIZATION_INVITE_CANCELLED = "organization_invite_cancelled"
    ORGANIZATION_INVITE_DECLINED = "organization_invite_declined"
    
    # Novos (Solicitações):
    ORGANIZATION_JOIN_REQUEST = "organization_join_request"
    ORGANIZATION_REQUEST_APPROVED = "organization_request_approved"
    ORGANIZATION_REQUEST_REJECTED = "organization_request_rejected"
    
    # Novos (Membros):
    ORGANIZATION_MEMBER_REMOVED = "organization_member_removed"
    ORGANIZATION_MEMBER_LEFT = "organization_member_left"
    
    # Novos (Organizers):
    ORGANIZATION_ORGANIZER_ADDED = "organization_organizer_added"
    ORGANIZATION_ORGANIZER_REMOVED = "organization_organizer_removed"
    
    # Novos (Propriedade):
    ORGANIZATION_OWNERSHIP_RECEIVED = "organization_ownership_received"
    ORGANIZATION_OWNERSHIP_TRANSFERRED = "organization_ownership_transferred"
    
    # Novos (Admin):
    ORGANIZATION_APPROVED = "organization_approved"
    ORGANIZATION_SUSPENDED = "organization_suspended"
    ORGANIZATION_UNSUSPENDED = "organization_unsuspended"
    ORGANIZATION_DELETED = "organization_deleted"
```

---

## 📦 Estrutura de Extra Data Padrão

Todas as notificações de organizações devem incluir:

```json
{
  "organization_id": "uuid",
  "organization_name": "string",
  "organization_slug": "string",
  // Campos específicos por tipo:
  "actor_id": "uuid",        // Quem executou a ação
  "actor_name": "string",    // Nome de quem executou
  "target_id": "uuid",       // Quem foi afetado (opcional)
  "target_name": "string",   // Nome de quem foi afetado (opcional)
  "reason": "string"         // Motivo (para ações admin, opcional)
}
```

---

## 🚀 Plano de Implementação Sugerido

### **Fase 1: Fluxo de Entrada** (+ Crítico para UX)
1. `request_to_join()` - Notificar admins
2. `approve_join_request()` - Notificar solicitante
3. `reject_join_request()` - Notificar solicitante

### **Fase 2: Gerenciamento de Membros**
4. `remove_member()` - Notificar removido
5. `add_organizer()` - Notificar promovido
6. `remove_organizer()` - Notificar despromovido
7. `leave_organization()` - Notificar admins

### **Fase 3: Convites Pendentes**
8. `decline_invite()` - Notificar quem convidou
9. `cancel_invite()` - Notificar convidado

### **Fase 4: Propriedade**
10. `transfer_ownership()` - Notificar novo e antigo owner

### **Fase 5: Administrativo**
11. `admin_accept_organization()` - Notificar owner
12. `admin_suspend_organization()` - Notificar liderança
13. `admin_unsuspend_organization()` - Notificar liderança
14. `admin_delete_organization()` - Notificar todos

---

## 💡 Observações Importantes

### **Notificações em Lote**
Alguns métodos afetam múltiplos usuários:
- `admin_delete_organization()` → Notificar TODOS os membros ativos
- `admin_suspend_organization()` → Notificar owner + organizers
- `leave_organization()` → Notificar owner + organizers

### **Workflow Novu**
Cada tipo precisa de um workflow no dashboard do Novu com:
- Template de mensagem in-app
- Variáveis dinâmicas (organization_name, actor_name, etc)
- Configuração de prioridade

### **Action URLs Sugeridas**
```
organization_invite → /organizations/{slug}/invites
organization_join_request → /organizations/{slug}/requests (admin view)
organization_request_approved → /organizations/{slug}
organization_member_removed → /organizations
organization_organizer_added → /organizations/{slug}/settings
organization_ownership_received → /organizations/{slug}/settings
```

---

## 🔧 Helper Function Recomendada

Criar uma função auxiliar no `organization_service.py`:

```python
async def _send_notification(
    self,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    organization: Organization,
    extra_data: dict = None,
    action_url: str = None
):
    """Helper para enviar notificações de forma consistente."""
    try:
        base_extra_data = {
            "organization_id": str(organization.id),
            "organization_name": organization.name,
            "organization_slug": organization.slug,
        }
        
        if extra_data:
            base_extra_data.update(extra_data)
        
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8003/api/notifications/send",
                json={
                    "user_id": str(user_id),
                    "type": notification_type,
                    "title": title,
                    "message": message,
                    "extra_data": base_extra_data,
                    "action_url": action_url or f"/organizations/{organization.slug}"
                },
                timeout=5.0
            )
            logger.info(f"Notificação {notification_type} enviada para {user_id}")
    except Exception as e:
        logger.error(f"Erro ao enviar notificação {notification_type}: {e}")
```

---

## 📊 Estatísticas

- **Total de métodos no OrganizationService:** 37
- **Métodos que precisam notificações:** 16 (15 novos + 2 já feitos)
- **Métodos que NÃO precisam:** 21 (consultas e ações próprias)
- **Novos tipos de notificação:** 13
- **Tipos já implementados:** 2

**Taxa de cobertura necessária:** 43% dos métodos (muito bom, significa que o sistema está bem desenhado)

---

## ✅ Checklist de Implementação

### Backend (notifications-service)
- [ ] Adicionar 13 novos tipos ao `NotificationType` enum
- [ ] Criar workflows no dashboard do Novu para cada tipo
- [ ] Testar cada tipo de notificação

### Backend (auth-service)
- [ ] Criar helper `_send_notification()` no `organization_service.py`
- [ ] Implementar notificações na Fase 1 (request_to_join, approve, reject)
- [ ] Implementar notificações na Fase 2 (remove_member, organizers)
- [ ] Implementar notificações na Fase 3 (decline_invite, cancel_invite)
- [ ] Implementar notificações na Fase 4 (transfer_ownership)
- [ ] Implementar notificações na Fase 5 (admin actions)
- [ ] Adicionar testes unitários para cada notificação

### Frontend
- [ ] Adicionar ícones para novos tipos de notificação
- [ ] Testar navegação via action_url de cada tipo
- [ ] Verificar exibição correta de todas as mensagens

---

## 🎯 Recomendação Final

**Comece pela Fase 1** (request_to_join, approve, reject) pois:
1. É o fluxo mais usado depois de convites
2. Tem maior impacto na experiência do usuário
3. É relativamente simples de implementar
4. Permite validar o padrão antes de escalar

Quer que eu comece a implementar a Fase 1? 🚀
