"""Exceções relacionadas a usuários"""

from common.exceptions import AppException
from fastapi import status


class UserNotFoundError(AppException):
    """Lançada quando um usuário não é encontrado."""

    def __init__(self, identifier: str):
        super().__init__(
            message=f"Usuário {identifier} não encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            code="USER_NOT_FOUND",
        )


class UserAlreadyExistsError(AppException):
    """Lançada ao tentar criar um usuário que já existe."""

    def __init__(self, field: str, value: str):
        super().__init__(
            message=f"Já existe um usuário com {field}: {value}",
            status_code=status.HTTP_409_CONFLICT,
            code="USER_ALREADY_EXISTS",
        )


class UsernameAlreadyInUseError(AppException):
    """Lançada quando o nome de usuário já está em uso."""

    def __init__(self, username: str):
        super().__init__(
            message=f"Nome de usuário '{username}' já está em uso",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="USERNAME_IN_USE",
        )


class EmailAlreadyInUseError(AppException):
    """Lançada quando o email já está cadastrado."""

    def __init__(self, email: str):
        super().__init__(
            message=f"Email '{email}' já está cadastrado",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMAIL_IN_USE",
        )


class EmailAlreadyVerifiedError(AppException):
    """Lançada ao tentar verificar um email já verificado."""

    def __init__(self):
        super().__init__(
            message="Este email já foi verificado",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMAIL_ALREADY_VERIFIED",
        )


class UserNotActivatedError(AppException):
    """Lançada quando a conta do usuário não está ativada."""

    def __init__(self):
        super().__init__(
            message="Conta não verificada. Verifique seu email.",
            status_code=status.HTTP_403_FORBIDDEN,
            code="ACCOUNT_NOT_VERIFIED",
        )


class UserDisabledError(AppException):
    """Lançada quando a conta do usuário está desativada."""

    def __init__(self):
        super().__init__(
            message="Conta desativada pelo administrador",
            status_code=status.HTTP_403_FORBIDDEN,
            code="ACCOUNT_DISABLED",
        )


class UserActivationError(AppException):
    """Lançada quando a ativação do usuário falha."""

    def __init__(self, message: str = "Erro ao ativar usuário"):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="ACTIVATION_ERROR",
        )


class RegistrationError(AppException):
    """Lançada quando o registro do usuário falha."""

    def __init__(self, message: str = "Falha ao criar usuário"):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="REGISTRATION_ERROR",
        )


class AvatarUploadError(AppException):
    """Lançada quando o upload do avatar falha."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="AVATAR_UPLOAD_ERROR",
        )


class IdentityConflictError(AppException):
    """Lançada quando há conflito entre identidades."""

    def __init__(self):
        super().__init__(
            message="Conflito de identidade: email já vinculado a outra conta",
            status_code=status.HTTP_409_CONFLICT,
            code="IDENTITY_CONFLICT",
        )


class NotAdminError(AppException):
    """Lançada quando o usuário não é um administrador."""

    def __init__(self, action: str = "realizar esta ação"):
        super().__init__(
            message=f"Apenas administradores podem {action}",
            status_code=status.HTTP_403_FORBIDDEN,
            code="NOT_ADMIN",
        )
