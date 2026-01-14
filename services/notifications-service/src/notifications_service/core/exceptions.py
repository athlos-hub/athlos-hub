"""Exceções personalizadas do serviço de notificações."""

from common.exceptions import AppException


class NotificationNotFoundException(AppException):
    """Exceção quando notificação não é encontrada."""

    def __init__(self, notification_id: str):
        super().__init__(
            message=f"Notificação {notification_id} não encontrada",
            status_code=404,
            code="NOTIFICATION_NOT_FOUND",
        )


class NotificationAccessDeniedException(AppException):
    """Exceção quando usuário tenta acessar notificação de outro usuário."""

    def __init__(self):
        super().__init__(
            message="Você não tem permissão para acessar esta notificação",
            status_code=403,
            code="NOTIFICATION_ACCESS_DENIED",
        )


class InvalidNotificationTypeException(AppException):
    """Exceção quando tipo de notificação é inválido."""

    def __init__(self, notification_type: str):
        super().__init__(
            message=f"Tipo de notificação '{notification_type}' inválido",
            status_code=400,
            code="INVALID_NOTIFICATION_TYPE",
        )


class NovuException(AppException):
    """Exceção quando há erro ao comunicar com Novu."""

    def __init__(self, message: str = "Erro ao comunicar com serviço de notificações"):
        super().__init__(
            message=message,
            status_code=500,
            code="NOVU_ERROR",
        )
