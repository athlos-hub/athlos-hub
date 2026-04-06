from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import logging
from src.models.competition import CompetitionModel, CompetitionPhase, CompetitionStatus, CompetitionSystem
from src.models.matches import GroupModel, RoundModel, MatchModel, MatchStatus
from src.models.standings import ClassificationModel
from .generate_competitions_utils import get_elimination_round_names
from src.config.settings import settings
from src.infrastructure.messaging.live_match_publisher import publish_live_creates_for_matches
from src.services.auth_client import AuthClient, AuthClientError


logger = logging.getLogger(__name__)


class EndGroupPhaseService:
    def __init__ (self, session: AsyncSession):
        self.session = session

    async def _resolve_organization_id(self, organization_slug: str | None) -> UUID | None:
        if not organization_slug:
            return None
        try:
            async with AuthClient() as auth_client:
                data = await auth_client.check_organization_exists(organization_slug)
            if not data.get("exists"):
                return None
            org_id = data.get("organization_id")
            return UUID(str(org_id)) if org_id else None
        except (AuthClientError, ValueError, TypeError):
            logger.exception(
                "Falha ao resolver organization_id para slug %s ao enfileirar lives",
                organization_slug,
            )
            return None

    async def advance_group_phase(self, competition_id: UUID):
        """
        Finaliza a fase de grupos:
        1. Lê a classificação final de cada grupo.
        2. Determina os cruzamentos (Ex: 1º do A vs 2º do B).
        3. Atualiza os jogos da primeira rodada do mata-mata com os times reais.
        """
        query = select(CompetitionModel).where(CompetitionModel.id == competition_id)
        result = await self.session.execute(query)
        competition = result.scalar_one_or_none()
        
        if not competition:
            raise HTTPException(status_code=404, detail="Competição não encontrada.")
        if competition.system != CompetitionSystem.MIXED:
            raise HTTPException(
                status_code=400,
                detail="Avanço de fase é permitido apenas para competições no sistema misto (grupos + mata-mata).",
            )
        if competition.status != CompetitionStatus.STARTED:
            raise HTTPException(
                status_code=400,
                detail="A competição precisa estar iniciada para avançar de fase.",
            )
        if competition.current_phase == CompetitionPhase.ELIMINATION:
            raise HTTPException(
                status_code=400,
                detail="A competição já está na fase eliminatória.",
            )

        raw_qualified_per_group = getattr(competition, "teams_qualified_per_group", None)
        QUALIFIED_PER_GROUP = (
            raw_qualified_per_group
            if isinstance(raw_qualified_per_group, int) and raw_qualified_per_group > 0
            else 2
        )

        groups_query = select(GroupModel).where(GroupModel.competition_id == competition.id).order_by(GroupModel.name)
        groups_result = await self.session.execute(groups_query)
        groups = groups_result.scalars().all()

        if not groups:
            raise HTTPException(status_code=400, detail="Esta competição não possui grupos para avançar.")

        pending_group_matches_query = select(MatchModel.id).where(
            MatchModel.competition_id == competition.id,
            MatchModel.group_id.is_not(None),
            MatchModel.status != MatchStatus.FINISHED,
        )
        pending_group_matches_result = await self.session.execute(pending_group_matches_query)
        pending_group_match_ids = pending_group_matches_result.scalars().all()
        if pending_group_match_ids:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Não é possível avançar de fase: ainda existem jogos da fase de grupos não finalizados."
                ),
            )

        placeholder_map = {}
        
        for group in groups:
            standings_query = (
                select(ClassificationModel)
                .where(ClassificationModel.group_id == group.id)
                .order_by(
                    desc(ClassificationModel.points),
                    desc(ClassificationModel.wins),
                    desc(ClassificationModel.score_balance),
                    desc(ClassificationModel.score_pro)
                )
                .options(selectinload(ClassificationModel.team))
                .limit(QUALIFIED_PER_GROUP)
            )
            
            standings_result = await self.session.execute(standings_query)
            top_teams_classification = standings_result.scalars().all()

            # Compatibilidade para competições antigas:
            # em alguns casos MIXED com 1 grupo, a classificação foi criada apenas na tabela geral (group_id=None).
            if len(top_teams_classification) < QUALIFIED_PER_GROUP and len(groups) == 1:
                fallback_query = (
                    select(ClassificationModel)
                    .where(
                        ClassificationModel.competition_id == competition.id,
                        ClassificationModel.group_id.is_(None),
                    )
                    .order_by(
                        desc(ClassificationModel.points),
                        desc(ClassificationModel.wins),
                        desc(ClassificationModel.score_balance),
                        desc(ClassificationModel.score_pro)
                    )
                    .options(selectinload(ClassificationModel.team))
                    .limit(QUALIFIED_PER_GROUP)
                )
                fallback_result = await self.session.execute(fallback_query)
                fallback_rows = fallback_result.scalars().all()
                if len(fallback_rows) >= QUALIFIED_PER_GROUP:
                    logger.warning(
                        "advance_group_phase: usando classificação geral como fallback para grupo único (%s)",
                        group.name,
                    )
                    top_teams_classification = fallback_rows

            if len(top_teams_classification) < QUALIFIED_PER_GROUP:
                raise HTTPException(
                    status_code=400, 
                    detail=f"O grupo {group.name} não tem times suficientes classificados (esperado {QUALIFIED_PER_GROUP})."
                )

            for pos, classification in enumerate(top_teams_classification, start=1):
                key = f"{pos}º {group.name}"
                placeholder_map[key] = classification.team

        clashes = self._create_clashes(groups, QUALIFIED_PER_GROUP)

        total_qualified = len(groups) * QUALIFIED_PER_GROUP
        
        elimination_names = get_elimination_round_names(total_qualified)
        if not elimination_names:
             raise HTTPException(status_code=400, detail="Erro ao calcular fases eliminatórias.")
             
        first_round_name = elimination_names[0]

        round_query = select(RoundModel).where(
            RoundModel.competition_id == competition.id,
            RoundModel.name.contains(first_round_name) 
        )
        round_result = await self.session.execute(round_query)
        target_round = round_result.scalar_one_or_none()

        if not target_round:
             raise HTTPException(status_code=404, detail=f"Rodada '{first_round_name}' não encontrada no banco.")

        matches_query = (
            select(MatchModel)
            .where(MatchModel.round_id == target_round.id)
            .order_by(MatchModel.round_number_match)
        )
        matches_result = await self.session.execute(matches_query)
        matches = matches_result.scalars().all()

        if len(matches) != len(clashes):
            raise HTTPException(
                status_code=500, 
                detail=f"Inconsistência: Temos {len(clashes)} confrontos previstos mas {len(matches)} jogos na rodada."
            )

        matches_updated = 0
        newly_scheduled: list[MatchModel] = []
        for i, match in enumerate(matches):
            home_placeholder, away_placeholder = clashes[i]
            
            home_team = placeholder_map.get(home_placeholder)
            away_team = placeholder_map.get(away_placeholder)
            
            if home_team and away_team:
                match.home_team_id = home_team.id
                match.away_team_id = away_team.id
                match.status = MatchStatus.SCHEDULED
                self.session.add(match)
                newly_scheduled.append(match)
                matches_updated += 1
            else:
                print(f"ERRO: Não encontrei times para o confronto {home_placeholder} x {away_placeholder}")

        competition.current_phase = CompetitionPhase.ELIMINATION
        self.session.add(competition)
        await self.session.commit()

        if settings.RABBITMQ_URL and newly_scheduled:
            organization_id = await self._resolve_organization_id(
                competition.organization_slug if hasattr(competition, "organization_slug") else None
            )
            if organization_id:
                try:
                    await publish_live_creates_for_matches(newly_scheduled, organization_id)
                    logger.info(
                        "Fase de grupos encerrada: %s lives enfileiradas para confrontos do mata-mata",
                        len(newly_scheduled),
                    )
                except Exception:
                    logger.exception(
                        "Falha ao enfileirar lives para confrontos recém-agendados do mata-mata"
                    )

        return {
            "message": "Fase de grupos finalizada com sucesso.",
            "qualified_teams": total_qualified,
            "matches_updated": matches_updated,
            "round_name": first_round_name
        }
    
    def _create_clashes(self, groups: list, qualified_per_group: int) -> list:
        """
        Cria os confrontos teóricos baseados nos grupos.
        Lógica:
        - Lista todos os classificados: 1ºA, 2ºA, 1ºB, 2ºB...
        - Separa os 'Cabeças de Chave' (1ºs lugares) dos 'Potes Baixos' (2ºs lugares).
        - Inverte o pote baixo para cruzar extremos (A vs H, B vs G...).
        """
        all_placeholders = []
        
        first_places = []
        second_places = []
        
        for group in groups:
            first_places.append(f"1º {group.name}")
            if qualified_per_group >= 2:
                second_places.append(f"2º {group.name}")
        
        clashes = []
        if qualified_per_group == 2:
            rotated_seconds = second_places[1:] + second_places[:1]
            clashes = list(zip(first_places, rotated_seconds))
        else:
            all_seeds = first_places + second_places
            mid = len(all_seeds) // 2
            top = all_seeds[:mid]
            bottom = all_seeds[mid:]
            bottom.reverse()
            clashes = list(zip(top, bottom))
            
        return clashes