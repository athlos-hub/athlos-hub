"""Exceções relacionadas a membros de organizações"""

from common.exceptions import AppException
from fastapi import status


class MembershipNotFoundError(AppException):
    """Lançada quando a associação não é encontrada."""

    def __init__(self, message: str = "Membro não encontrado na organização"):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            code="MEMBERSHIP_NOT_FOUND",
        )


class MembershipAlreadyExistsError(AppException):
    """Lançada quando a associação já existe."""

    def __init__(
        self,
        message: str = "O usuário já é membro ou tem uma solicitação pendente para esta organização",
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            code="MEMBERSHIP_ALREADY_EXISTS",
        )


class InviteNotFoundError(AppException):
    """Lançada quando o convite não é encontrado."""

    def __init__(self):
        super().__init__(
            message="Você não tem um convite pendente para esta organização",
            status_code=status.HTTP_404_NOT_FOUND,
            code="INVITE_NOT_FOUND",
        )


class JoinRequestNotFoundError(AppException):
    """Lançada quando a solicitação de entrada não é encontrada."""

    def __init__(self):
        super().__init__(
            message="Você não possui uma solicitação de entrada pendente para esta organização",
            status_code=status.HTTP_404_NOT_FOUND,
            code="JOIN_REQUEST_NOT_FOUND",
        )


class CannotRemoveOwnerError(AppException):
    """Lançada ao tentar remover o proprietário da organização."""

    def __init__(self):
        super().__init__(
            message="O proprietário da organização não pode ser removido",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="CANNOT_REMOVE_OWNER",
        )


class CannotRemoveSelfError(AppException):
    """Lançada ao tentar remover a si mesmo via remoção de membro."""

    def __init__(self):
        super().__init__(
            message="Você não pode remover a si mesmo. Use o endpoint /leave para sair da organização",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="CANNOT_REMOVE_SELF",
        )


class OwnerCannotLeaveError(AppException):
    """Lançada quando o proprietário tenta sair da organização."""

    def __init__(self):
        super().__init__(
            message="O proprietário da organização não pode sair. Transfira a propriedade ou exclua a organização.",
            status_code=status.HTTP_403_FORBIDDEN,
            code="OWNER_CANNOT_LEAVE",
        )


class NotActiveMemberError(AppException):
    """Lançada quando o usuário não é um membro ativo."""

    def __init__(self):
        super().__init__(
            message="Você não é um membro ativo desta organização",
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_ACTIVE_MEMBER",
        )


class MustBeActiveMemberError(AppException):
    """Lançada quando o usuário deve ser membro ativo para a ação."""

    def __init__(self):
        super().__init__(
            message="O usuário deve ser um membro ativo da organização para se tornar organizador",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MUST_BE_ACTIVE_MEMBER",
        )


class NotMemberError(AppException):
    """Lançada quando o usuário não é um membro."""

    def __init__(self, action: str = "realizar esta ação"):
        super().__init__(
            message=f"Apenas membros da organização podem {action}",
            status_code=status.HTTP_403_FORBIDDEN,
            code="NOT_MEMBER",
        )


class JoinPolicyViolationError(AppException):
    """Lançada quando a ação de entrada viola a política da organização."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code="JOIN_POLICY_VIOLATION",
        )


class InviteRequiredError(AppException):
    """Lançada quando a organização requer convite para entrar."""

    def __init__(self):
        super().__init__(
            message="Esta organização aceita apenas convites",
            status_code=status.HTTP_403_FORBIDDEN,
            code="INVITE_REQUIRED",
        )
