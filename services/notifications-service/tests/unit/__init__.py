"""
Testes unitários para o Notifications Service.

Este pacote contém testes unitários abrangentes para o serviço de notificações,
cobrindo serviços de domínio, repositórios e schemas.

Estrutura:
- conftest.py: Fixtures compartilhadas e configuração de testes
- services/: Testes para NotificationService
- repositories/: Testes para NotificationRepository
- schemas/: Testes para schemas de dados

Cobertura atual: 55% (59 testes passando)

Para executar os testes:
    cd /workspaces/athlos-hub/services/notifications-service
    export PYTHONPATH=$PYTHONPATH:$(pwd)/src
    poetry run pytest tests/unit/ -v
"""
