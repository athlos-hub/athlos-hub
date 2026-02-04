"""
Testes de integração para o Notifications Service.

Este pacote contém testes de integração end-to-end para os endpoints da API,
testando o comportamento completo com banco de dados em memória.

Estrutura:
- conftest.py: Fixtures e configuração de testes de integração
- test_health_routes.py: Testes dos endpoints de health check
- test_notification_routes.py: Testes dos endpoints de notificações

Para executar os testes:
    cd /workspaces/athlos-hub/services/notifications-service
    export PYTHONPATH=$PYTHONPATH:$(pwd)/src
    poetry run pytest tests/integration/ -v
"""
