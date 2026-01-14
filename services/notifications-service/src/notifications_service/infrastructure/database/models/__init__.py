"""Inicialização dos modelos."""

from notifications_service.infrastructure.database.models.notification_model import (
    Notification,
    NotificationType,
)

__all__ = ["Notification", "NotificationType"]
