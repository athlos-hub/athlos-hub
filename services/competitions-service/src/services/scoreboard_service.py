from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
from typing import Optional

from src.models.matches import MatchModel, SegmentModel
from src.schemas.scoreboard_schema import ScoreboardSchema, SegmentScoreSchema, UpdateScoreRequest
from src.websockets.scoreboard_manager import scoreboard_manager
from fastapi import HTTPException

class ScoreboardService:
    """Serviço para gerenciamento de placares"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_scoreboard(self, match_id: uuid.UUID) -> ScoreboardSchema:
        """Obtém o placar completo de uma partida com todos os segments"""
        # Busca a partida com seus relacionamentos
        query = (
            select(MatchModel)
            .where(MatchModel.id == match_id)
            .options(
                selectinload(MatchModel.segments),
                selectinload(MatchModel.home_team),
                selectinload(MatchModel.away_team)
            )
        )
        
        result = await self.session.execute(query)
        match = result.scalar_one_or_none()
        
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Converte segments para o schema
        segments = [
            SegmentScoreSchema(
                segment_number=seg.segment_number,
                segment_type=seg.segment_type,
                home_score=seg.home_score,
                away_score=seg.away_score,
                finished=seg.finished
            )
            for seg in sorted(match.segments, key=lambda s: s.segment_number)
        ]
        
        return ScoreboardSchema(
            match_id=match.id,
            home_team_id=match.home_team_id,
            away_team_id=match.away_team_id,
            home_team_name=match.home_team.name if match.home_team else None,
            away_team_name=match.away_team.name if match.away_team else None,
            home_total_score=match.home_score,
            away_total_score=match.away_score,
            segments=segments,
            status=match.status.value if hasattr(match.status, 'value') else str(match.status)
        )
    
    async def update_segment_score(
        self, 
        match_id: uuid.UUID, 
        update_data: UpdateScoreRequest
    ) -> ScoreboardSchema:
        """Atualiza o placar de um segment específico e recalcula o placar total"""
        # Busca a partida
        query = (
            select(MatchModel)
            .where(MatchModel.id == match_id)
            .options(selectinload(MatchModel.segments))
        )
        
        result = await self.session.execute(query)
        match = result.scalar_one_or_none()
        
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Busca ou cria o segment
        segment = next(
            (s for s in match.segments if s.segment_number == update_data.segment_number),
            None
        )
        
        if not segment:
            # Cria novo segment se não existir
            segment = SegmentModel(
                match_id=match_id,
                segment_number=update_data.segment_number,
                segment_type="REGULAR",  # Pode ser customizado
                home_score=0,
                away_score=0,
                finished=False
            )
            self.session.add(segment)
            match.segments.append(segment)
        
        # Atualiza o segment
        segment.home_score = update_data.home_score
        segment.away_score = update_data.away_score
        segment.finished = update_data.finished
        
        # Recalcula o placar total somando todos os segments
        match.home_score = sum(s.home_score for s in match.segments)
        match.away_score = sum(s.away_score for s in match.segments)
        
        await self.session.commit()
        await self.session.refresh(match)
        
        # Obtém o placar atualizado
        scoreboard = await self.get_scoreboard(match_id)
        
        # Transmite via WebSocket para todos os clientes conectados
        await scoreboard_manager.broadcast_to_match(
            str(match_id),
            {
                "type": "scoreboard_update",
                "data": scoreboard.model_dump(mode="json")
            }
        )
        
        return scoreboard
    
    async def initialize_segments(
        self, 
        match_id: uuid.UUID, 
        num_segments: int = 2,
        segment_type: str = "REGULAR"
    ):
        """Inicializa os segments de uma partida (ex: 2 tempos de futebol)"""
        query = select(MatchModel).where(MatchModel.id == match_id)
        result = await self.session.execute(query)
        match = result.scalar_one_or_none()
        
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Verifica se já existem segments
        existing_query = select(SegmentModel).where(SegmentModel.match_id == match_id)
        existing_result = await self.session.execute(existing_query)
        existing_segments = existing_result.scalars().all()
        
        if existing_segments:
            raise HTTPException(status_code=400, detail="Segments already initialized")
        
        # Cria os segments
        for i in range(1, num_segments + 1):
            segment = SegmentModel(
                match_id=match_id,
                segment_number=i,
                segment_type=segment_type,
                home_score=0,
                away_score=0,
                finished=False
            )
            self.session.add(segment)
        
        await self.session.commit()
        
        return await self.get_scoreboard(match_id)
