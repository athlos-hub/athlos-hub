import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CompetitionAchievementDefinitionResponse(BaseModel):
    id: uuid.UUID
    competition_id: uuid.UUID
    stat_type_id: uuid.UUID
    stat_type_name: str
    code: str
    title: str
    title_locked: bool = False
    target_type: Literal["PLAYER", "TEAM"] = "PLAYER"
    description: Optional[str] = None
    top_n: int
    active: bool

    model_config = ConfigDict(from_attributes=True)


class CompetitionAchievementDefinitionPatch(BaseModel):
    """Atualizar nome exibido da conquista ou voltar ao título automático (Top <métrica>)."""

    title: Optional[str] = Field(None, max_length=180)
    reset_auto_title: bool = False
    target_type: Optional[Literal["PLAYER", "TEAM"]] = None

    @model_validator(mode="after")
    def _exclusive(self):
        if self.reset_auto_title and self.title is not None:
            raise ValueError("Use apenas reset_auto_title ou title, não ambos.")
        if not self.reset_auto_title and self.title is None and self.target_type is None:
            raise ValueError("Envie title, target_type ou reset_auto_title.")
        return self


class CompetitionAchievementAwardResponse(BaseModel):
    id: uuid.UUID
    competition_id: uuid.UUID
    definition_id: uuid.UUID
    target_type: Literal["PLAYER", "TEAM"] = "PLAYER"
    player_id: Optional[uuid.UUID] = None
    player_keycloak_id: Optional[uuid.UUID] = None
    team_id: Optional[uuid.UUID] = None
    rank_position: int
    stat_value: int
    created_at: datetime
    achievement_title: str
    achievement_code: str
    stat_type_name: str

    model_config = ConfigDict(from_attributes=True)
