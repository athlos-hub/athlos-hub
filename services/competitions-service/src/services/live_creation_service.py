import logging
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.matches import MatchModel
from src.models.competition import CompetitionModel

logger = logging.getLogger(__name__)


class LiveCreationService:
    """Service responsável por criar lives para as partidas geradas"""
    
    def __init__(
        self, 
        session: AsyncSession,
        livestream_client,  # LivestreamClient
        organization_id: UUID
    ):
        """
        Args:
            session: Sessão do SQLAlchemy
            livestream_client: Cliente configurado para o live-service
            organization_id: ID da organização dona da competição
        """
        self.session = session
        self.livestream_client = livestream_client
        self.organization_id = organization_id
    
    async def create_lives_for_matches(
        self, 
        matches: List[MatchModel],
        competition: CompetitionModel
    ) -> List[Dict[str, Any]]:
        """
        Cria lives no live-service para cada partida
        
        Args:
            matches: Lista de partidas criadas
            competition: Competição associada
            
        Returns:
            Lista com os dados das lives criadas
            
        Raises:
            LivestreamClientError: Se houver erro na criação de alguma live
        """
        created_lives = []
        
        logger.info(
            f"Iniciando criação de {len(matches)} lives para competição "
            f"{competition.id} ({competition.name})"
        )
        
        for match in matches:
            try:
                live_data = await self.livestream_client.create_live(
                    external_match_id=match.id,
                    organization_id=self.organization_id,
                    transmit_video=getattr(match, "transmit_video", True),
                )
                
                created_lives.append({
                    "match_id": match.id,
                    "live_id": live_data.get("id"),
                    "stream_key": live_data.get("streamKey"),
                    "status": live_data.get("status")
                })
                
                logger.debug(
                    f"Live criada para partida {match.id}: "
                    f"live_id={live_data.get('id')}"
                )
                
            except Exception as e:
                logger.error(
                    f"Falha ao criar live para partida {match.id}: {e}"
                )
                # Re-lança a exceção para acionar o rollback
                raise
        
        logger.info(
            f"Criadas {len(created_lives)} lives com sucesso para "
            f"competição {competition.id}"
        )
        
        return created_lives
