"""Exceções relacionadas a organizações"""

from typing import Optional

from common.exceptions import AppException
from fastapi import status


class OrganizationNotFoundError(AppException):
    """Lançada quando uma organização não é encontrada."""

    def __init__(self, identifier: str):
        super().__init__(
            message=f"Organização '{identifier}' não encontrada",
            status_code=status.HTTP_404_NOT_FOUND,
            code="ORGANIZATION_NOT_FOUND",
        )


class OrganizationAlreadyExistsError(AppException):
    """Lançada ao tentar criar uma organização que já existe."""

    def __init__(self, detail: Optional[str] = None):
        msg = "Já existe uma organização com esse nome/slug."
        if detail:
            msg = f"Já existe uma organização identificada por '{detail}'."

        super().__init__(
            message=msg,
            status_code=status.HTTP_409_CONFLICT,
            code="ORGANIZATION_ALREADY_EXISTS",
        )


OrganizationAlreadyExists = OrganizationAlreadyExistsError


class OrganizationAccessDeniedError(AppException):
    """Lançada quando o usuário não tem acesso à organização."""

    def __init__(self, message: str = "Acesso negado à organização"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code="ORGANIZATION_ACCESS_DENIED",
        )


class OrganizationInactiveError(AppException):
    """Lançada ao tentar executar ação em organização inativa."""

    def __init__(self):
        super().__init__(
            message="Organização está inativa",
            status_code=status.HTTP_409_CONFLICT,
            code="ORGANIZATION_INACTIVE",
        )


class OrganizationStatusConflictError(AppException):
    """Lançada quando o status da organização não permite a ação."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            code="ORGANIZATION_STATUS_CONFLICT",
        )


class OrganizerAlreadyExistsError(AppException):
    """Lançada quando o usuário já é um organizador."""

    def __init__(self):
        super().__init__(
            message="O usuário já é um organizador desta organização",
            status_code=status.HTTP_409_CONFLICT,
            code="ORGANIZER_ALREADY_EXISTS",
        )


class OrganizerNotFoundError(AppException):
    """Lançada quando o organizador não é encontrado."""

    def __init__(self):
        super().__init__(
            message="O usuário não é um organizador desta organização",
            status_code=status.HTTP_404_NOT_FOUND,
            code="ORGANIZER_NOT_FOUND",
        )


class OwnerNotNeedOrganizerError(AppException):
    """Lançada ao tentar tornar o proprietário um organizador."""

    def __init__(self):
        super().__init__(
            message="O proprietário não precisa ser organizador, ele já tem todos os privilégios",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="OWNER_NOT_NEED_ORGANIZER",
        )


class NotOwnerError(AppException):
    """Lançada quando o usuário não é o proprietário."""

    def __init__(self, action: str = "realizar esta ação"):
        super().__init__(
            message=f"Apenas o proprietário da organização pode {action}",
            status_code=status.HTTP_403_FORBIDDEN,
            code="NOT_OWNER",
        )


class NotOwnerOrOrganizerError(AppException):
    """Lançada quando o usuário não é proprietário ou organizador."""

    def __init__(self, action: str = "realizar esta ação"):
        super().__init__(
            message=f"Apenas o proprietário ou organizadores podem {action}",
            status_code=status.HTTP_403_FORBIDDEN,
            code="NOT_OWNER_OR_ORGANIZER",
        )


class AlreadyOwnerError(AppException):
    """Lançada quando o usuário já é o proprietário."""

    def __init__(self):
        super().__init__(
            message="Você já é o proprietário desta organização",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="ALREADY_OWNER",
        )


class NewOwnerNotActiveMemberError(AppException):
    """Lançada quando o novo proprietário não é um membro ativo."""

    def __init__(self):
        super().__init__(
            message="O novo proprietário deve ser um membro ativo da organização",
            status_code=status.HTTP_404_NOT_FOUND,
            code="NEW_OWNER_NOT_ACTIVE_MEMBER",
        )
