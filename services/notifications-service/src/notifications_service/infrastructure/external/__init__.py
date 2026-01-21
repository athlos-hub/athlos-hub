"""Inicialização de serviços externos."""

from notifications_service.infrastructure.external.novu_client import (
    NovuClient,
    novu_client,
)

__all__ = ["NovuClient", "novu_client"]
