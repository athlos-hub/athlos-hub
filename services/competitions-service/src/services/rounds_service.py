from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.models.matches import RoundModel, MatchModel
from src.models.competition import CompetitionModel
from src.models.modality import ModalityModel

class RoundsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_rounds_by_competition(self, competition_id: int):
        """
        Lista todas as rodadas de uma competição com seus respectivos jogos.
        Útil para campeonatos de pontos corridos ou visualização geral.
        """
        query = (
            select(RoundModel)
            .where(RoundModel.competition_id == competition_id)
            .order_by(RoundModel.id) # Ou order_by(RoundModel.name)
            .options(
                # Carrega os jogos da rodada
                selectinload(RoundModel.matches).options(
                    # E dentro dos jogos, carrega Times, Competição e Modalidade
                    # (Necessário para preencher o MatchOrgResponse)
                    selectinload(MatchModel.home_team),
                    selectinload(MatchModel.away_team),
                    selectinload(MatchModel.competition).selectinload(CompetitionModel.modality)
                )
            )
        )
        
        result = await self.session.execute(query)
        return self._format_response(result.scalars().all())

    async def get_rounds_by_group(self, group_id: int):
        """
        Lista as rodadas e jogos específicos de um Grupo.
        Faz um JOIN com MatchModel para garantir que só pegamos rodadas que têm jogos desse grupo.
        """
        query = (
            select(RoundModel)
            .join(RoundModel.matches) # Join para filtrar pelo grupo dos jogos
            .where(MatchModel.group_id == group_id)
            .distinct() # Evita duplicatas se a rodada tiver múltiplos jogos
            .order_by(RoundModel.id)
            .options(
                selectinload(RoundModel.matches).options(
                    selectinload(MatchModel.home_team),
                    selectinload(MatchModel.away_team),
                    selectinload(MatchModel.competition).selectinload(CompetitionModel.modality)
                )
            )
        )

        result = await self.session.execute(query)
        rounds = result.scalars().all()
        
        # IMPORTANTE: O selectinload acima traz TODOS os jogos da rodada.
        # Se por acaso uma rodada for compartilhada entre grupos (raro, mas possível),
        # precisaríamos filtrar os jogos no Python.
        # Assumindo que o gerador cria rodadas exclusivas por grupo ("Grupo A - Rodada 1"),
        # o retorno direto funciona.
        
        return self._format_response(rounds)

    def _format_response(self, rounds: List[RoundModel]):
        """Helper para formatar a resposta no padrão do Schema (Flattening dos jogos)"""
        response = []
        for r in rounds:
            matches_formatted = []
            for m in r.matches:
                # Transforma o Model Match no dicionário plano esperado pelo MatchOrgResponse
                matches_formatted.append({
                    "id": m.id,
                    "status": m.status,
                    "scheduled_datetime": m.scheduled_datetime,
                    "local": m.local,
                    "round_match_number": m.round_match_number,
                    "competition_name": m.competition.name,
                    "modality_name": m.competition.modality.name,
                    "home_team": m.home_team,
                    "away_team": m.away_team,
                    "home_score": m.home_score,
                    "away_score": m.away_score
                })
            
            response.append({
                "id": r.id,
                "name": r.name,
                "matches": matches_formatted
            })
            
        return response
    
    async def get_rounds_by_org(self, org_code: str):
        """
        Lista todas as rodadas de todas as competições de uma organização.
        """
        query = (
            select(RoundModel)
            .join(RoundModel.competition)    # Join com Competition
            .join(CompetitionModel.modality) # Join com Modality
            .where(ModalityModel.org_code == org_code)
            .order_by(CompetitionModel.id, RoundModel.id) # Ordena por competição e depois por rodada
            .options(
                # Carregamento profundo para montar a resposta completa
                selectinload(RoundModel.matches).options(
                    selectinload(MatchModel.home_team),
                    selectinload(MatchModel.away_team),
                    selectinload(MatchModel.competition).selectinload(CompetitionModel.modality)
                )
            )
        )

        result = await self.session.execute(query)
        return self._format_response(result.scalars().all())