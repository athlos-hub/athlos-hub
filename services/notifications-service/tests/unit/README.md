# Testes Unitários - Notifications Service

## Visão Geral

Este documento descreve os testes unitários implementados para o serviço de notificações. Os testes cobrem os principais componentes do sistema, incluindo serviços, repositórios e schemas.

## Estrutura de Testes

```
tests/
├── unit/
│   ├── __init__.py
│   ├── conftest.py                      # Fixtures compartilhadas
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── test_notification_repository.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── test_notification_schemas.py
│   └── services/
│       ├── __init__.py
│       └── test_notification_service.py
```

## Cobertura de Testes

### Resumo
- **Total de Testes:** 59
- **Cobertura Geral:** 55%
- **Status:** ✅ Todos os testes passando

### Cobertura por Módulo

| Módulo | Cobertura | Observações |
|--------|-----------|-------------|
| `notification_service.py` | 91% | Serviço principal de notificações |
| `notification_repository.py` | 100% | Repositório de notificações |
| `notification.py` (schemas) | 100% | Schemas de dados |
| `notification_model.py` | 96% | Modelo de banco de dados |
| `exceptions.py` | 85% | Exceções customizadas |

## Componentes Testados

### 1. NotificationService (15 testes)

#### Criação de Notificações (4 testes)
- ✅ `test_create_notification_success` - Criação bem-sucedida
- ✅ `test_create_notification_without_novu` - Criação sem enviar para Novu
- ✅ `test_create_notification_novu_failure` - Falha do Novu (graceful handling)
- ✅ `test_create_notification_sse_failure` - Falha do SSE (graceful handling)

#### Busca de Notificações (6 testes)
- ✅ `test_get_notification_success` - Busca bem-sucedida
- ✅ `test_get_notification_not_found` - Notificação não encontrada
- ✅ `test_get_notification_access_denied` - Acesso negado
- ✅ `test_list_user_notifications_success` - Listagem bem-sucedida
- ✅ `test_list_user_notifications_unread_only` - Filtrar apenas não lidas
- ✅ `test_list_user_notifications_pagination` - Paginação

#### Marcar como Lida (4 testes)
- ✅ `test_mark_as_read_success` - Marcar como lida
- ✅ `test_mark_as_read_not_found` - Notificação não encontrada
- ✅ `test_mark_as_read_access_denied` - Acesso negado
- ✅ `test_mark_all_as_read_success` - Marcar todas como lidas

#### Contagem (1 teste)
- ✅ `test_count_unread_success` - Contar não lidas

#### Deleção (4 testes)
- ✅ `test_delete_notification_success` - Deletar notificação
- ✅ `test_delete_notification_not_found` - Notificação não encontrada
- ✅ `test_delete_notification_access_denied` - Acesso negado
- ✅ `test_clear_all_notifications_success` - Limpar todas

#### Notificações de Organização (2 testes)
- ✅ `test_send_organization_invite` - Convite para organização
- ✅ `test_send_organization_accepted` - Convite aceito

### 2. NotificationRepository (15 testes)

#### Criação (1 teste)
- ✅ `test_create_notification` - Criar notificação no banco

#### Busca por ID (2 testes)
- ✅ `test_get_by_id_found` - Notificação encontrada
- ✅ `test_get_by_id_not_found` - Notificação não encontrada

#### Busca por Usuário (4 testes)
- ✅ `test_get_by_user_success` - Buscar notificações do usuário
- ✅ `test_get_by_user_with_pagination` - Com paginação
- ✅ `test_get_by_user_unread_only` - Apenas não lidas
- ✅ `test_get_by_user_empty_result` - Resultado vazio

#### Marcar como Lida (4 testes)
- ✅ `test_mark_as_read_success` - Marcar como lida
- ✅ `test_mark_as_read_not_found` - Notificação não encontrada
- ✅ `test_mark_all_as_read_success` - Marcar todas
- ✅ `test_mark_all_as_read_no_unread` - Sem não lidas

#### Contagem (2 testes)
- ✅ `test_count_unread_with_notifications` - Com notificações
- ✅ `test_count_unread_no_notifications` - Sem notificações

#### Deleção (3 testes)
- ✅ `test_delete_notification` - Deletar notificação
- ✅ `test_delete_all_by_user_success` - Deletar todas
- ✅ `test_delete_all_by_user_no_notifications` - Sem notificações

### 3. Schemas (22 testes)

#### NotificationBase (3 testes)
- ✅ `test_notification_base_valid` - Dados válidos
- ✅ `test_notification_base_without_action_url` - Sem URL de ação
- ✅ `test_notification_base_missing_required_fields` - Campos obrigatórios

#### NotificationCreate (4 testes)
- ✅ `test_notification_create_valid` - Dados válidos
- ✅ `test_notification_create_without_optional_fields` - Sem opcionais
- ✅ `test_notification_create_missing_user_id` - Sem user_id
- ✅ `test_notification_create_with_organization_data` - Com dados de organização

#### NotificationResponse (4 testes)
- ✅ `test_notification_response_from_model` - A partir do modelo
- ✅ `test_notification_response_read_notification` - Notificação lida
- ✅ `test_notification_response_extra_data_serialization` - Serialização de metadata
- ✅ `test_notification_response_json_serialization` - Serialização JSON

#### NotificationListResponse (3 testes)
- ✅ `test_notification_list_response_valid` - Lista válida
- ✅ `test_notification_list_response_empty` - Lista vazia
- ✅ `test_notification_list_response_pagination` - Paginação

#### UnreadCountResponse (3 testes)
- ✅ `test_unread_count_response_valid` - Contagem válida
- ✅ `test_unread_count_response_zero` - Contagem zero
- ✅ `test_unread_count_response_negative_not_allowed` - Validação de negativos

#### SendNotificationRequest (3 testes)
- ✅ `test_send_notification_request_valid` - Request válido
- ✅ `test_send_notification_request_without_optional_fields` - Sem opcionais
- ✅ `test_send_notification_request_organization_invite` - Convite de organização

#### Integração (2 testes)
- ✅ `test_create_to_response_flow` - Fluxo completo
- ✅ `test_list_response_with_multiple_types` - Múltiplos tipos

## Fixtures Disponíveis

### IDs de Teste
- `sample_user_id` - UUID de usuário de exemplo
- `sample_notification_id` - UUID de notificação de exemplo
- `sample_organization_id` - UUID de organização de exemplo

### Objetos
- `sample_notification` - Notificação de teste não lida
- `sample_read_notification` - Notificação de teste lida
- `multiple_notifications` - Lista de 5 notificações

### Mocks
- `mock_async_session` - Mock de AsyncSession do SQLAlchemy
- `mock_notification_repository` - Mock do repositório
- `mock_novu_client` - Mock do cliente Novu
- `mock_sse_manager` - Mock do gerenciador SSE

## Executando os Testes

### Todos os testes unitários
```bash
cd /workspaces/athlos-hub/services/notifications-service
export PYTHONPATH=$PYTHONPATH:$(pwd)/src
poetry run pytest tests/unit/ -v
```

### Testes de um componente específico
```bash
# Apenas NotificationService
poetry run pytest tests/unit/services/ -v

# Apenas NotificationRepository
poetry run pytest tests/unit/repositories/ -v

# Apenas Schemas
poetry run pytest tests/unit/schemas/ -v
```

### Com relatório de cobertura
```bash
poetry run pytest tests/unit/ --cov=src/notifications_service --cov-report=html
```

O relatório HTML será gerado em `htmlcov/index.html`.

### Executar teste específico
```bash
poetry run pytest tests/unit/services/test_notification_service.py::TestNotificationServiceCreate::test_create_notification_success -v
```

## Variáveis de Ambiente para Testes

Os testes unitários configuram automaticamente as seguintes variáveis de ambiente:
- `NOVU_API_KEY=test-api-key`
- `NOVU_APP_ID=test-app-id`
- `DATABASE_URL=postgresql://test:test@localhost:5432/test`

Essas são configuradas no arquivo `conftest.py` antes de importar os módulos.

## Estratégia de Testes

### Testes Unitários
Os testes unitários focam em:
- ✅ Isolar componentes individuais
- ✅ Usar mocks para dependências externas (Novu, SSE, Database)
- ✅ Testar casos de sucesso e falha
- ✅ Validar tratamento de erros
- ✅ Verificar edge cases

### Mocking
- **Repositório**: Mockado para evitar acesso ao banco de dados
- **Novu Client**: Mockado para evitar chamadas à API externa
- **SSE Manager**: Mockado para evitar conexões WebSocket
- **AsyncSession**: Mockado para simular transações do SQLAlchemy

### Casos de Teste
Para cada funcionalidade, testamos:
1. ✅ **Happy Path** - Cenário de sucesso
2. ✅ **Error Cases** - Exceções esperadas
3. ✅ **Edge Cases** - Casos limites
4. ✅ **Access Control** - Permissões e segurança

## Melhorias Futuras

### Cobertura
- [ ] Adicionar testes para rotas da API (controller layer)
- [ ] Adicionar testes para SSE Manager
- [ ] Adicionar testes para Novu Client
- [ ] Aumentar cobertura de exceções customizadas

### Funcionalidades
- [ ] Testes de integração com banco de dados real
- [ ] Testes de performance
- [ ] Testes de carga para SSE
- [ ] Testes end-to-end

## Dependências de Teste

```toml
[dependency-groups]
dev = [
    "black (>=25.12.0,<26.0.0)",
    "pytest (>=8.3.0,<9.0.0)",
    "pytest-asyncio (>=0.25.0,<1.0.0)",
    "pytest-cov (>=6.0.0,<7.0.0)"
]
```

## Troubleshooting

### Erro: ModuleNotFoundError
Certifique-se de exportar o PYTHONPATH:
```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/src
```

### Erro: ValidationError (Pydantic Settings)
As variáveis de ambiente são configuradas automaticamente no `conftest.py`. Se o erro persistir, verifique se o arquivo está sendo importado corretamente.

### Warnings de deprecação
Os warnings sobre `datetime.utcnow()` são conhecidos e serão corrigidos em versões futuras, migrando para `datetime.now(datetime.UTC)`.

## Contribuindo

Ao adicionar novos testes:
1. Siga a estrutura de classes `Test*` existente
2. Use fixtures do `conftest.py` quando possível
3. Documente cada teste com docstring descritiva
4. Mantenha os testes isolados e independentes
5. Use mocks para dependências externas
6. Execute todos os testes antes de commitar

## Contato

Para dúvidas sobre os testes, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.
