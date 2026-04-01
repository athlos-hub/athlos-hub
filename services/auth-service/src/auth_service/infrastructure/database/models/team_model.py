"""
Modelos de Time para o auth-service.

Os times são criados e gerenciados no auth-service até serem aprovados.
Após aprovação, são enviados para o competitions-service.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from auth_service.infrastructure.database.base import Base
from auth_service.infrastructure.database.models.enums import TeamInviteStatus, TeamStatus

if TYPE_CHECKING:
    from auth_service.infrastructure.database.models.organization_model import Organization
    from auth_service.infrastructure.database.models.user_model import User


class Team(Base):
    """
    Modelo de Time.
    
    Um time é criado no auth-service e fica aqui até ser aprovado.
    Ao ser aprovado, é enviado para o competitions-service.
    """
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Relacionamento com organização
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ID da competição no competitions-service (UUID)
    competition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Nome da competição (para exibição)
    competition_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Dados do time
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    abbreviation: Mapped[str] = mapped_column(String(3), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Status do time
    status: Mapped[TeamStatus] = mapped_column(
        Enum(TeamStatus, name="team_status"),
        default=TeamStatus.PENDING,
        nullable=False,
    )

    # Mínimo de membros para aprovação
    min_members: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_members: Mapped[int] = mapped_column(Integer, default=20, nullable=False)

    # Criador do time (será o capitão inicial)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ID do time no competitions-service (preenchido após aprovação)
    external_team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relacionamentos
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="teams",
    )
    members: Mapped[list["TeamMember"]] = relationship(
        "TeamMember",
        back_populates="team",
        cascade="all, delete-orphan",
    )
    invites: Mapped[list["TeamInvite"]] = relationship(
        "TeamInvite",
        back_populates="team",
        cascade="all, delete-orphan",
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by],
    )

    # Constraint: um time único por organização+competição+nome
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "competition_id", "name",
            name="uq_team_org_competition_name"
        ),
    )

    @property
    def captain(self) -> Optional["TeamMember"]:
        """Retorna o capitão do time."""
        for member in self.members:
            if member.is_captain:
                return member
        return None

    @property
    def member_count(self) -> int:
        """Retorna o número de membros do time."""
        return len(self.members)

    @property
    def is_ready_for_approval(self) -> bool:
        """Verifica se o time pode ser aprovado (tem mínimo de membros)."""
        return self.member_count >= self.min_members

    def __repr__(self) -> str:
        return f"<Team name={self.name} status={self.status}>"


class TeamMember(Base):
    """
    Modelo de Membro do Time.
    """
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    is_captain: Mapped[bool] = mapped_column(default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relacionamentos
    team: Mapped["Team"] = relationship("Team", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="team_memberships")

    def __repr__(self) -> str:
        return f"<TeamMember team_id={self.team_id} user_id={self.user_id} captain={self.is_captain}>"


class TeamInvite(Base):
    """
    Modelo de Convite do Time.
    
    Permite que o capitão gere links de convite para novos membros.
    """
    __tablename__ = "team_invites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Token único para o link de convite
    invite_token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )

    # Quem criou o convite (deve ser o capitão)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Datas
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Status do convite
    status: Mapped[TeamInviteStatus] = mapped_column(
        Enum(TeamInviteStatus, name="team_invite_status"),
        default=TeamInviteStatus.PENDING,
        nullable=False,
    )

    # Número máximo de usos (None = ilimitado)
    max_uses: Mapped[Optional[int]] = mapped_column(nullable=True, default=None)
    use_count: Mapped[int] = mapped_column(default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relacionamentos
    team: Mapped["Team"] = relationship("Team", back_populates="invites")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])

    # Índice composto
    __table_args__ = (
        Index('ix_team_invites_token_status', 'invite_token', 'status'),
    )

    @staticmethod
    def generate_token() -> str:
        """Gera um token seguro para o convite."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def default_expiration(days: int = 7) -> datetime:
        """Retorna a data de expiração padrão."""
        from datetime import timezone
        return datetime.now(timezone.utc) + timedelta(days=days)

    @property
    def is_valid(self) -> bool:
        """Verifica se o convite ainda é válido."""
        from datetime import timezone
        if self.status != TeamInviteStatus.PENDING:
            return False
        now = datetime.now(timezone.utc)
        expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        if now > expires:
            return False
        if self.max_uses is not None and self.use_count >= self.max_uses:
            return False
        return True

    def __repr__(self) -> str:
        return f"<TeamInvite team_id={self.team_id} status={self.status}>"
