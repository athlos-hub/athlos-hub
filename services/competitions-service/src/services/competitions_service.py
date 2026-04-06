from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from uuid import UUID

from src.models.competition import CompetitionModel, CompetitionStatus
from src.models.sport_ruleset import SportRulesetModel
from src.models.modality import ModalityModel
from src.models.matches import MatchModel, MatchStatus
from src.models.stats import StatsRuleSetModel, StatsTypeModel
from src.models.teams import TeamModel, PlayerModel
from src.schemas.competition_schema import CompetitionCreate, CompetitionUpdate
from src.config.settings import settings
from src.services.social_client import SocialServiceClient
from src.services.achievements_service import AchievementsService
from src.services.stats_ruleset_service import StatsRuleSetService

class CompetitionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.social_client = SocialServiceClient(settings.SOCIAL_SERVICE_URL)
        self.achievements_service = AchievementsService(session, self.social_client)

    async def create(self, data: CompetitionCreate) -> CompetitionModel:
        """
        Cria uma nova competição.
        Lida com a lógica de criar novos Rulesets (sport e stats) ou reutilizar existentes.
        """
        
        # 1. Validação da Modalidade
        query_modality = select(ModalityModel).where(ModalityModel.id == data.modality_id)
        result_modality = await self.session.execute(query_modality)
        modality = result_modality.scalar_one_or_none()
        if not modality:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Modalidade com ID {data.modality_id} não encontrada."
            )
        organization_slug = modality.organization_slug

        # 2. Resolução do Sport Ruleset (Regras do Jogo) - OPCIONAL
        final_sport_ruleset_id = None

        if data.sport_ruleset_id:
            query_ruleset = select(SportRulesetModel).where(SportRulesetModel.id == data.sport_ruleset_id)
            result_ruleset = await self.session.execute(query_ruleset)
            existing_ruleset = result_ruleset.scalar_one_or_none()
            
            if not existing_ruleset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail=f"Sport Ruleset com ID {data.sport_ruleset_id} não encontrado."
                )
            if (
                existing_ruleset.organization_slug is None
                or existing_ruleset.organization_slug != organization_slug
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O conjunto de regras esportivas não pertence a esta organização.",
                )
            final_sport_ruleset_id = existing_ruleset.id

        elif data.ruleset:
            new_ruleset = SportRulesetModel(
                **data.ruleset.model_dump(),
                organization_slug=organization_slug,
            )
            self.session.add(new_ruleset)
            await self.session.flush() 
            final_sport_ruleset_id = new_ruleset.id
        # Se nenhum foi fornecido, final_sport_ruleset_id permanece None (válido)

        # 3. Criação da Competição
        comp_data = data.model_dump(exclude={
            "ruleset", 
            "sport_ruleset_id", 
            "stats_ruleset", 
            "stats_ruleset_id"
        })
        
        # Converter datetime com timezone para naive (sem timezone)
        # O banco usa TIMESTAMP WITHOUT TIME ZONE
        if comp_data.get("start_date") and comp_data["start_date"].tzinfo:
            comp_data["start_date"] = comp_data["start_date"].replace(tzinfo=None)
        if comp_data.get("end_date") and comp_data["end_date"].tzinfo:
            comp_data["end_date"] = comp_data["end_date"].replace(tzinfo=None)
        
        new_competition = CompetitionModel(
            **comp_data,
            sport_ruleset_id=final_sport_ruleset_id, 
            status=CompetitionStatus.PENDING    
        )
        self.session.add(new_competition)
        await self.session.flush()  # Precisamos do competition.id para stats_ruleset

        # 4. Resolução do Stats Ruleset (se fornecido)
        # IMPORTANTE: Agora um stats_ruleset pode ser usado por múltiplas competições
        if data.stats_ruleset_id:
            # Verificar se o stats_ruleset existe
            query_stats = select(StatsRuleSetModel).where(StatsRuleSetModel.id == data.stats_ruleset_id)
            result_stats = await self.session.execute(query_stats)
            existing_stats = result_stats.scalar_one_or_none()
            
            if not existing_stats:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stats Ruleset com ID {data.stats_ruleset_id} não encontrado."
                )
            
            # Como removemos o unique constraint, podemos reutilizar o stats_ruleset
            # Mas vamos criar uma cópia vinculada a esta competição para manter
            # o controle individual (se desejar compartilhamento, remova esse bloco)
            stats_data = {
                "name": existing_stats.name,
                "description": existing_stats.description,
                "competition_id": new_competition.id
            }
            new_stats_copy = StatsRuleSetModel(**stats_data)
            self.session.add(new_stats_copy)
            await self.session.flush()
            
            # Copiar os tipos de estatísticas
            query_types = select(StatsTypeModel).where(StatsTypeModel.stats_ruleset_id == data.stats_ruleset_id)
            result_types = await self.session.execute(query_types)
            existing_types = result_types.scalars().all()
            
            for existing_type in existing_types:
                type_data = {
                    "name": existing_type.name,
                    "abbreviation": existing_type.abbreviation,
                    "description": existing_type.description,
                    "display_order": existing_type.display_order,
                    "stats_ruleset_id": new_stats_copy.id
                }
                new_type = StatsTypeModel(**type_data)
                self.session.add(new_type)

        elif data.stats_ruleset:
            # Criar novo stats ruleset com seus tipos
            stats_data = data.stats_ruleset.model_dump(exclude={"stats_types"})
            new_stats_ruleset = StatsRuleSetModel(
                **stats_data,
                competition_id=new_competition.id
            )
            self.session.add(new_stats_ruleset)
            await self.session.flush()

            # Criar os tipos de estatísticas
            used_abbreviations = set()
            for stat_type_data in data.stats_ruleset.stats_types:
                payload = stat_type_data.model_dump()
                incoming_abbr = (payload.get("abbreviation") or "").strip().upper()
                if incoming_abbr:
                    payload["abbreviation"] = incoming_abbr
                    used_abbreviations.add(incoming_abbr)
                else:
                    payload["abbreviation"] = StatsRuleSetService._next_available_abbreviation(
                        payload.get("name", ""),
                        used_abbreviations,
                    )
                stat_type = StatsTypeModel(
                    **payload,
                    stats_ruleset_id=new_stats_ruleset.id
                )
                self.session.add(stat_type)

        await self.session.commit()

        # 5. Recarregar com relacionamentos
        query_refresh = (
            select(CompetitionModel)
            .options(
                selectinload(CompetitionModel.modality),  # Carrega modalidade para organization_slug
                selectinload(CompetitionModel.sport_ruleset),
                selectinload(CompetitionModel.stats_ruleset).selectinload(StatsRuleSetModel.stats_types)
            )
            .where(CompetitionModel.id == new_competition.id)
        )
        result_refresh = await self.session.execute(query_refresh)
        
        return result_refresh.scalar_one()


    async def list_all(self, skip: int = 0, limit: int = 100, organization_slug: Optional[str] = None, status: Optional[str] = None):
        query = (
            select(CompetitionModel)
            .options(
                selectinload(CompetitionModel.sport_ruleset),
                selectinload(CompetitionModel.stats_ruleset).selectinload(StatsRuleSetModel.stats_types),
                selectinload(CompetitionModel.modality)
            )
        )
        
        if organization_slug:
            query = query.join(CompetitionModel.modality).where(
                ModalityModel.organization_slug == organization_slug
            )
        
        if status:
            try:
                status_enum = CompetitionStatus(status)
                query = query.where(CompetitionModel.status == status_enum)
            except ValueError:
                pass  # Ignorar status inválido

        query = query.order_by(desc(CompetitionModel.start_date)).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_id(self, competition_id: UUID) -> CompetitionModel:
        query = (
            select(CompetitionModel)
            .options(
                selectinload(CompetitionModel.modality),  # Carrega modalidade para pegar organization_slug
                selectinload(CompetitionModel.sport_ruleset),
                selectinload(CompetitionModel.stats_ruleset).selectinload(StatsRuleSetModel.stats_types)
            )
            .where(CompetitionModel.id == competition_id)
        )
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")
            
        return competition

    async def update(self, competition_id: UUID, data: CompetitionUpdate) -> CompetitionModel:
        competition = await self.get_by_id(competition_id)
        if competition.status == CompetitionStatus.FINISHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competição finalizada não pode ser editada.",
            )
        update_data = data.model_dump(exclude_unset=True)
        can_edit_before_start = competition.status == CompetitionStatus.PENDING

        teams_count_result = await self.session.execute(
            select(TeamModel.id).where(TeamModel.competition_id == competition_id)
        )
        has_teams = len(teams_count_result.scalars().all()) > 0
        stats_ruleset = await self.get_stats_ruleset(competition_id)

        if "name" in update_data and not can_edit_before_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Só é possível alterar o nome antes do início da competição.",
            )

        if ("system" in update_data or "sport_ruleset_id" in update_data) and not can_edit_before_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sistema e regras esportivas só podem ser alterados antes do início da competição.",
            )

        if ("min_members_per_team" in update_data or "max_members_per_team" in update_data) and has_teams:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível alterar limite de membros com times já inscritos.",
            )

        if "sport_ruleset_id" in update_data and update_data["sport_ruleset_id"] is not None:
            modality = await self.session.get(ModalityModel, competition.modality_id)
            org_slug = modality.organization_slug if modality else None
            if not org_slug:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Modalidade da competição inválida.",
                )
            rs_result = await self.session.execute(
                select(SportRulesetModel).where(SportRulesetModel.id == update_data["sport_ruleset_id"])
            )
            ruleset = rs_result.scalar_one_or_none()
            if not ruleset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Sport Ruleset com ID {update_data['sport_ruleset_id']} não encontrado.",
                )
            if ruleset.organization_slug is None or ruleset.organization_slug != org_slug:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O conjunto de regras esportivas não pertence a esta organização.",
                )

        stats_mode = update_data.pop("stats_ruleset_mode", None)
        if stats_mode:
            if stats_mode not in {"keep", "none", "new"}:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='stats_ruleset_mode inválido. Use "keep", "none" ou "new".',
                )

            if not can_edit_before_start:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Conjunto de estatísticas só pode ser alterado antes do início da competição.",
                )

            if stats_mode == "none":
                if not stats_ruleset:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A competição já está sem conjunto de estatísticas.",
                    )
                if stats_ruleset.stats_types and len(stats_ruleset.stats_types) > 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Só é possível remover o conjunto de estatísticas quando não há métricas cadastradas.",
                    )
                await self.session.delete(stats_ruleset)

            if stats_mode == "new":
                if stats_ruleset:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A competição já possui conjunto de estatísticas.",
                    )
                new_stats_ruleset = StatsRuleSetModel(
                    name=f"Estatísticas {competition.name}",
                    description="Conjunto de estatísticas da competição",
                    competition_id=competition.id,
                )
                self.session.add(new_stats_ruleset)

        if "start_date" in update_data and update_data["start_date"] and update_data["start_date"].tzinfo:
            update_data["start_date"] = update_data["start_date"].replace(tzinfo=None)
        if "end_date" in update_data and update_data["end_date"] and update_data["end_date"].tzinfo:
            update_data["end_date"] = update_data["end_date"].replace(tzinfo=None)

        for key, value in update_data.items():
            setattr(competition, key, value)

        await self.session.commit()
        await self.session.refresh(competition)
        return await self.get_by_id(competition_id)

    async def delete(self, competition_id: UUID) -> None:
        competition = await self.get_by_id(competition_id)
        if competition.status == CompetitionStatus.FINISHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competição finalizada não pode ser excluída.",
            )
        try:
            await self.session.delete(competition)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Não foi possível excluir a competição porque ela possui vínculos ativos.",
            ) from exc

    async def get_stats_ruleset(self, competition_id: UUID) -> Optional[StatsRuleSetModel]:
        """
        Retorna o StatsRuleSet da competição com seus tipos de métricas.
        Retorna None se a competição não tiver stats configurados.
        """
        query = (
            select(StatsRuleSetModel)
            .options(selectinload(StatsRuleSetModel.stats_types))
            .where(StatsRuleSetModel.competition_id == competition_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_teams_with_players(self, competition_id: UUID) -> List[TeamModel]:
        """
        Retorna todos os times da competição com seus jogadores.
        """
        # Verifica se a competição existe
        comp_query = select(CompetitionModel).where(CompetitionModel.id == competition_id)
        comp_result = await self.session.execute(comp_query)
        if not comp_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Competição não encontrada")

        query = (
            select(TeamModel)
            .options(selectinload(TeamModel.players))
            .where(TeamModel.competition_id == competition_id)
            .order_by(TeamModel.name)
        )
        result = await self.session.execute(query)
        teams = list(result.scalars().all())
        # Evita lista duplicada se houver linhas órfãs com o mesmo auth_team_id (corrida na aprovação)
        seen_auth: set[UUID] = set()
        deduped: List[TeamModel] = []
        for t in teams:
            aid = getattr(t, "auth_team_id", None)
            if aid is not None:
                if aid in seen_auth:
                    continue
                seen_auth.add(aid)
            deduped.append(t)
        return deduped
    
    async def finalize_competition(self, competition_id: UUID) -> dict:
        """
        Finaliza uma competição e verifica todas as conquistas.
        
        Args:
            competition_id: ID da competição a ser finalizada
            
        Returns:
            Dicionário com informações sobre a finalização
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Buscar competição
        query = select(CompetitionModel).where(CompetitionModel.id == competition_id)
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada")
        
        if competition.status == CompetitionStatus.FINISHED:
            raise HTTPException(
                status_code=400, 
                detail="Competição já está finalizada"
            )
        if competition.status != CompetitionStatus.STARTED:
            raise HTTPException(
                status_code=400,
                detail="A competição só pode ser finalizada após ser iniciada.",
            )

        unfinished_matches_q = select(MatchModel.id).where(
            MatchModel.competition_id == competition_id,
            MatchModel.status.in_([MatchStatus.PENDING, MatchStatus.SCHEDULED, MatchStatus.LIVE]),
        )
        unfinished_matches_res = await self.session.execute(unfinished_matches_q)
        unfinished_match_ids = unfinished_matches_res.scalars().all()
        if unfinished_match_ids:
            raise HTTPException(
                status_code=400,
                detail="Não é possível finalizar a competição com jogos pendentes, agendados ou ao vivo.",
            )
        
        # Atualizar status para finalizada
        competition.status = CompetitionStatus.FINISHED
        self.session.add(competition)
        await self.session.commit()
        
        # Verificar conquistas
        achievements_checked = True
        error_message = None
        
        try:
            await self.achievements_service.check_competition_end_achievements(
                competition.id
            )
        except Exception as e:
            logger.error(f"Erro ao verificar conquistas: {str(e)}", exc_info=True)
            achievements_checked = False
            error_message = str(e)
        
        return {
            "competition_id": competition_id,
            "competition_name": competition.name,
            "status": competition.status.value,
            "achievements_checked": achievements_checked,
            "message": "Competição finalizada com sucesso" if achievements_checked 
                      else f"Competição finalizada, mas houve erro ao verificar conquistas: {error_message}"
        }
