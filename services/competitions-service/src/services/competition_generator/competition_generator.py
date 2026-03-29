from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from uuid import UUID

from src.models.competition import CompetitionModel, CompetitionSystem, CompetitionStatus
from src.models.teams import TeamModel
from src.models.matches import MatchModel
from .standings_manager import initialize_standings
from .generate_league import GenerateLeagueCompetitionService as LeagueService
from .generate_elimination import GenerateEliminationCompetitionService as EliminationService
from .generate_group import GenerateGroupCompetitionService as GroupService
from ..livestream_client import LivestreamClient, LivestreamClientError
from ..live_creation_service import LiveCreationService
from src.config.settings import settings

logger = logging.getLogger(__name__)


class StructureGeneratorService:
    """
    Service responsável por gerar a estrutura completa de uma competição
    e criar as lives associadas no live-service
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def generate_structure(
        self, 
        competition_id: int,
        organization_id: UUID
    ):
        """
        Gera Rounds, Matches, Segments, Standings e Lives.
        Muda o status da competição para STARTED.
        
        Em caso de falha na criação das lives, faz rollback de toda a estrutura.
        
        Args:
            competition_id: ID da competição
            organization_id: ID da organização (para criar lives)
            
        Returns:
            Dict com mensagem de sucesso, sistema e quantidade de lives criadas
            
        Raises:
            HTTPException: Para erros de validação ou de processamento
        """
        # 1. Buscar competição
        query = (
            select(CompetitionModel)
            .options(selectinload(CompetitionModel.sport_ruleset))
            .where(CompetitionModel.id == competition_id)
        )
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")
        
        # 2. Validar status
        current_status = str(competition.status).upper() if competition.status else ""
        if current_status != "PENDING":
            raise HTTPException(
                status_code=400, 
                detail="A competição já foi iniciada ou finalizada."
            )
        
        # 3. Criar ruleset padrão se não existir
        if not competition.sport_ruleset:
            logger.warning(f"Competição {competition_id} sem ruleset. Criando ruleset padrão...")
            from src.models.sport_ruleset import SportRulesetModel
            
            default_ruleset = SportRulesetModel(
                name="Regras Padrão",
                segment_type="TIME",
                segments_regular_number=2,
                overtime_segments=0,
                penalty_segments=0,
                has_break_segments=True
            )
            self.session.add(default_ruleset)
            await self.session.flush()
            
            competition.sport_ruleset_id = default_ruleset.id
            competition.sport_ruleset = default_ruleset
            await self.session.flush()
            
            logger.info(f"Ruleset padrão {default_ruleset.id} criado para competição {competition_id}")
        
        # 4. Buscar times
        teams_query = select(TeamModel).where(TeamModel.competition_id == competition_id)
        teams_result = await self.session.execute(teams_query)
        teams = list(teams_result.scalars().all())
        
        if len(teams) < 2:
            raise HTTPException(
                status_code=400, 
                detail="Mínimo de 2 times necessários."
            )
        
        # 5. Inicializar cliente do livestream
        async with LivestreamClient(
            base_url=settings.LIVESTREAM_SERVICE_URL,
            timeout=settings.LIVESTREAM_SERVICE_TIMEOUT
        ) as livestream_client:
            
            # 6. Validar disponibilidade do live-service
            is_available = await livestream_client.health_check()
            if not is_available:
                logger.warning(
                    f"Livestream service indisponível em {settings.LIVESTREAM_SERVICE_URL}. "
                    "Continuando sem criar lives."
                )
                # Aqui você pode decidir: falhar ou continuar sem lives
                # Por ora, vou fazer falhar para garantir consistência
                raise HTTPException(
                    status_code=503,
                    detail="Livestream service indisponível. Tente novamente mais tarde."
                )
            
            try:
                # 7. Iniciar transação para geração da estrutura
                await initialize_standings(self.session, competition, teams)
                
                # 8. Gerar estrutura de acordo com o sistema
                matches: list[MatchModel] = []
                
                if competition.system == CompetitionSystem.POINTS:
                    league_service = LeagueService(self.session)
                    await league_service.generate_league_system(competition, teams)
                    matches = await self._get_competition_matches(competition_id)
                    
                elif competition.system == CompetitionSystem.ELIMINATION:
                    elimination_service = EliminationService(self.session)
                    await elimination_service.generate_elimination_system(competition, teams)
                    matches = await self._get_competition_matches(competition_id)
                    
                elif competition.system == CompetitionSystem.MIXED:
                    group_service = GroupService(self.session)
                    await group_service.generate_groups_elimination_system(competition, teams)
                    matches = await self._get_competition_matches(competition_id)
                    
                else:
                    raise HTTPException(
                        status_code=501, 
                        detail="Sistema de disputa ainda não implementado."
                    )
                
                # 9. Criar lives para as partidas
                logger.info(f"Criando {len(matches)} lives para competição {competition_id}")
                
                live_service = LiveCreationService(
                    session=self.session,
                    livestream_client=livestream_client,
                    organization_id=organization_id
                )
                
                created_lives = await live_service.create_lives_for_matches(
                    matches=matches,
                    competition=competition
                )
                
                # 10. Atualizar status da competição
                competition.status = (
                    CompetitionStatus.STARTED 
                    if hasattr(CompetitionStatus, 'STARTED') 
                    else "STARTED"
                )
                self.session.add(competition)
                
                # 11. Commit final
                await self.session.commit()
                
                logger.info(
                    f"Estrutura gerada com sucesso para competição {competition_id}. "
                    f"Lives criadas: {len(created_lives)}"
                )
                
                return {
                    "message": "Estrutura gerada com sucesso",
                    "system": competition.system,
                    "matches_created": len(matches),
                    "lives_created": len(created_lives),
                    "lives": created_lives
                }
                
            except LivestreamClientError as e:
                # Erro específico do livestream - fazer rollback
                logger.error(f"Erro ao criar lives: {e}")
                await self.session.rollback()
                raise HTTPException(
                    status_code=502,
                    detail=f"Falha ao criar lives no live service: {str(e)}"
                )
                
            except Exception as e:
                # Qualquer outro erro - fazer rollback
                logger.error(f"Erro ao gerar estrutura: {e}")
                await self.session.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro ao gerar estrutura da competição: {str(e)}"
                )
    
    async def _get_competition_matches(self, competition_id: int) -> list[MatchModel]:
        """
        Busca todas as partidas de uma competição
        
        Args:
            competition_id: ID da competição
            
        Returns:
            Lista de partidas da competição
        """
        query = select(MatchModel).where(MatchModel.competition_id == competition_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())