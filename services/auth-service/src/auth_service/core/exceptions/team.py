"""Exceções relacionadas a times."""

from typing import Optional
from uuid import UUID


class TeamError(Exception):
    """Classe base para erros de time."""
    pass


class TeamNotFoundError(TeamError):
    """Time não encontrado."""
    def __init__(self, team_id: str = None):
        self.team_id = team_id
        message = f"Time não encontrado: {team_id}" if team_id else "Time não encontrado"
        super().__init__(message)


class TeamAlreadyExistsError(TeamError):
    """Time já existe."""
    def __init__(self, name: str = None, competition_id: Optional[UUID] = None):
        self.name = name
        self.competition_id = competition_id
        message = f"Já existe um time com nome '{name}' nesta competição" if name else "Time já existe"
        super().__init__(message)


class TeamInviteNotFoundError(TeamError):
    """Convite de time não encontrado."""
    def __init__(self, token: str = None):
        self.token = token
        message = "Convite não encontrado ou expirado"
        super().__init__(message)


class TeamInviteExpiredError(TeamError):
    """Convite de time expirado."""
    def __init__(self):
        super().__init__("Convite expirado")


class TeamInviteMaxUsesReachedError(TeamError):
    """Convite atingiu número máximo de usos."""
    def __init__(self):
        super().__init__("Convite atingiu o número máximo de usos")


class TeamFullError(TeamError):
    """Time está cheio."""
    def __init__(self, max_members: int = None):
        self.max_members = max_members
        message = f"Time está cheio (máximo: {max_members})" if max_members else "Time está cheio"
        super().__init__(message)


class AlreadyTeamMemberError(TeamError):
    """Usuário já é membro do time."""
    def __init__(self):
        super().__init__("Usuário já é membro deste time")


class NotTeamMemberError(TeamError):
    """Usuário não é membro do time."""
    def __init__(self):
        super().__init__("Usuário não é membro deste time")


class NotTeamCaptainError(TeamError):
    """Usuário não é capitão do time."""
    def __init__(self):
        super().__init__("Apenas o capitão pode realizar esta ação")


class TeamNotReadyError(TeamError):
    """Time não está pronto para aprovação."""
    def __init__(self, current: int, required: int):
        self.current = current
        self.required = required
        message = f"Time precisa de {required} membros para ser aprovado (atual: {current})"
        super().__init__(message)


class TeamAlreadyApprovedError(TeamError):
    """Time já foi aprovado."""
    def __init__(self):
        super().__init__("Time já foi aprovado e registrado na competição")


class TeamStatusError(TeamError):
    """Status do time não permite esta ação."""
    def __init__(self, current_status: str, allowed_statuses: list[str] = None):
        self.current_status = current_status
        self.allowed_statuses = allowed_statuses
        if allowed_statuses:
            message = f"Time está com status '{current_status}'. Status permitidos: {', '.join(allowed_statuses)}"
        else:
            message = f"Time está com status '{current_status}' e não permite esta ação"
        super().__init__(message)


class PlayerAlreadyInCompetitionError(TeamError):
    """Jogador já está inscrito em outro time da mesma competição."""
    def __init__(self, keycloak_id: str = None):
        self.keycloak_id = keycloak_id
        message = "Jogador já está inscrito em outro time desta competição"
        super().__init__(message)


class CompetitionServiceError(TeamError):
    """Erro ao comunicar com competitions-service."""
    def __init__(self, detail: str = None):
        self.detail = detail
        message = f"Erro ao comunicar com serviço de competições: {detail}" if detail else "Erro ao comunicar com serviço de competições"
        super().__init__(message)
