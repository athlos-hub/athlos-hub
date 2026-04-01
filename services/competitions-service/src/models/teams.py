import uuid
from datetime import datetime, timedelta
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
import secrets

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.competition import CompetitionModel

class TeamStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"


class InviteStatus(str, enum.Enum):
    """Status do convite de time."""
    PENDING = "PENDING"      # Convite ativo, aguardando aceitação
    ACCEPTED = "ACCEPTED"    # Convite aceito
    EXPIRED = "EXPIRED"      # Convite expirado
    REVOKED = "REVOKED"      # Convite cancelado pelo capitão


class TeamInviteModel(Base):
    """
    Modelo para convites de time.
    O capitão gera um link de convite que pode ser usado por membros da organização
    para entrar no time.
    """
    __tablename__ = "team_invites"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    
    # Token único para o link de convite
    invite_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    
    # Quem criou o convite (deve ser o capitão)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    
    # Quem aceitou o convite (preenchido quando aceito)
    accepted_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Datas
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Status do convite
    status: Mapped[InviteStatus] = mapped_column(String(20), default=InviteStatus.PENDING)
    
    # Número máximo de usos (None = ilimitado)
    max_uses: Mapped[Optional[int]] = mapped_column(nullable=True, default=None)
    use_count: Mapped[int] = mapped_column(default=0)
    
    # Relacionamento com o time
    team: Mapped["TeamModel"] = relationship("TeamModel", back_populates="invites")
    
    # Índice para busca rápida por token
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
        return datetime.utcnow() + timedelta(days=days)
    
    @property
    def is_valid(self) -> bool:
        """Verifica se o convite ainda é válido."""
        if self.status != InviteStatus.PENDING:
            return False
        if datetime.utcnow() > self.expires_at.replace(tzinfo=None):
            return False
        if self.max_uses is not None and self.use_count >= self.max_uses:
            return False
        return True

class PlayerModel(Base):
    __tablename__ = "players"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    keycloak_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    team: Mapped["TeamModel"] = relationship(
        "TeamModel", 
        back_populates="players",
        foreign_keys=[team_id] 
    )

class TeamModel(Base):
    __tablename__ = "teams"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_slug: Mapped[str] = mapped_column(String(255), index=True) 
    competition_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("competitions.id"))
    name: Mapped[str] = mapped_column(String(100))
    abbreviation: Mapped[Optional[str]] = mapped_column(String(3), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    auth_team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[TeamStatus] = mapped_column(String(20), default=TeamStatus.PENDING) 

    competition: Mapped["CompetitionModel"] = relationship("CompetitionModel")

    team_captain: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("players.id", use_alter=True, name="fk_team_captain_id"), 
        nullable=True
    )

    players: Mapped[List["PlayerModel"]] = relationship(
        "PlayerModel", 
        back_populates="team",
        foreign_keys=[PlayerModel.team_id]
    )
    
    # Relacionamento para acessar o objeto do Capitão
    captain: Mapped[Optional["PlayerModel"]] = relationship(
        "PlayerModel",
        foreign_keys=[team_captain],
        post_update=True
    )
    
    # Relacionamento com convites
    invites: Mapped[List["TeamInviteModel"]] = relationship(
        "TeamInviteModel",
        back_populates="team",
        cascade="all, delete-orphan"
    )