"""Cliente interno para o serviço de notificações."""

from src.infrastructure.notification_publisher import send_competition_notification

__all__ = ["send_competition_notification"]
