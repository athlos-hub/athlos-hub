from pydantic import BaseModel, ConfigDict
from typing import List
from src.schemas.matches_schema import MatchOrgResponse # Reaproveitando seu schema completo de jogo

class RoundMatchesResponse(BaseModel):
    id: int
    name: str
    # Aqui aninhamos a lista de jogos que pertencem a esta rodada
    matches: List[MatchOrgResponse] = []

    model_config = ConfigDict(from_attributes=True)