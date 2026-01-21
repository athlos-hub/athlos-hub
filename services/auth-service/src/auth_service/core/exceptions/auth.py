"""Exceções relacionadas a autenticação"""

from common.exceptions import AppException
from fastapi import status


class AuthenticationError(AppException):
    """Erro base de autenticação."""

    def __init__(self, message: str = "Falha na autenticação"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTHENTICATION_ERROR",
        )


class InvalidCredentialsError(AppException):
    """Lançada quando as credenciais são inválidas."""

    def __init__(self):
        super().__init__(
            message="Email ou senha incorretos",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_CREDENTIALS",
        )


class InvalidTokenError(AppException):
    """Lançada quando o token é inválido."""

    def __init__(self, message: str = "Token de verificação inválido"):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_TOKEN",
        )


class TokenExpiredError(AppException):
    """Lançada quando o token está expirado."""

    def __init__(self):
        super().__init__(
            message="Link de verificação expirado. Solicite um novo.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_EXPIRED",
        )


class KeycloakCommunicationError(AppException):
    """Lançada quando a comunicação com o Keycloak falha."""

    def __init__(
        self, message: str = "Falha ao comunicar com servidor de autenticação"
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="KEYCLOAK_ERROR",
        )


class InvalidCallbackError(AppException):
    """Lançada quando o callback OAuth é inválido."""

    def __init__(self, message: str = "code e redirect_uri são obrigatórios"):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_CALLBACK",
        )


class RefreshTokenError(AppException):
    """Lançada quando a renovação do token falha."""

    def __init__(self):
        super().__init__(
            message="Falha ao renovar token. Por favor, faça login novamente.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="REFRESH_ERROR",
        )
