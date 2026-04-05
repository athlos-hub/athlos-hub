"""Lógica de importação de time aprovado no auth (HTTP interno ou fila)."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.competition import CompetitionModel, CompetitionStatus
from src.models.matches import MatchModel
from src.models.standings import ClassificationModel
from src.models.teams import PlayerModel, TeamInviteModel, TeamModel, TeamStatus
from src.schemas.internal_teams import TeamCreatedResponse, TeamFromAuthPayload

logger = logging.getLogger(__name__)


async def import_team_from_auth(
    session: AsyncSession, payload: TeamFromAuthPayload
) -> TeamCreatedResponse:
    """Cria time no competitions a partir do payload do auth-service."""
    logger.info(
        "Importando time aprovado: %s para competição %s",
        payload.name,
        payload.competition_id,
    )

    query = select(CompetitionModel).where(CompetitionModel.id == payload.competition_id)
    result = await session.execute(query)
    competition = result.scalar_one_or_none()

    if not competition:
        logger.warning("Competição %s não encontrada", payload.competition_id)
        raise HTTPException(
            status_code=404,
            detail=f"Competição {payload.competition_id} não encontrada",
        )

    if competition.status != CompetitionStatus.PENDING:
        logger.warning("Competição %s não está aberta para inscrições", payload.competition_id)
        raise HTTPException(
            status_code=400,
            detail="Competição não está aberta para inscrições",
        )

    # Idempotente: aprovação dupla / RPC+HTTP / reenvio não cria segundo registro
    existing_auth = await session.execute(
        select(TeamModel).where(
            TeamModel.competition_id == payload.competition_id,
            TeamModel.auth_team_id == payload.auth_team_id,
        )
    )
    already = existing_auth.scalar_one_or_none()
    if already:
        logger.info(
            "Importação idempotente: time auth_team_id=%s já existe na competição (team_id=%s)",
            payload.auth_team_id,
            already.id,
        )
        st = already.status
        status_val = st.value if hasattr(st, "value") else str(st)
        return TeamCreatedResponse(
            id=already.id,
            name=already.name,
            status=status_val,
            competition_id=already.competition_id,
        )

    num_players = len(payload.players)
    if num_players < competition.min_members_per_team:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Mínimo de {competition.min_members_per_team} jogadores requerido. "
                f"Fornecido: {num_players}"
            ),
        )

    if num_players > competition.max_members_per_team:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Máximo de {competition.max_members_per_team} jogadores permitido. "
                f"Fornecido: {num_players}"
            ),
        )

    captain_in_list = any(p.keycloak_id == payload.captain_keycloak_id for p in payload.players)
    if not captain_in_list:
        raise HTTPException(status_code=400, detail="Capitão deve estar na lista de jogadores")

    player_keycloak_ids = [p.keycloak_id for p in payload.players]
    existing_players_query = (
        select(PlayerModel)
        .join(TeamModel, PlayerModel.team_id == TeamModel.id)
        .where(
            TeamModel.competition_id == payload.competition_id,
            PlayerModel.keycloak_id.in_(player_keycloak_ids),
        )
    )
    result = await session.execute(existing_players_query)
    existing_players = result.scalars().all()

    if existing_players:
        duplicates = [str(p.keycloak_id) for p in existing_players]
        logger.warning("Jogadores já inscritos na competição: %s", duplicates)
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Alguns jogadores já estão em outros times desta competição",
                "duplicate_players": duplicates,
            },
        )

    existing_team_query = (
        select(TeamModel)
        .where(
            TeamModel.competition_id == payload.competition_id,
            TeamModel.organization_slug == payload.organization_slug,
            TeamModel.name == payload.name,
        )
    )
    result = await session.execute(existing_team_query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Já existe um time com nome '{payload.name}' nesta competição",
        )

    new_team = TeamModel(
        organization_slug=payload.organization_slug,
        competition_id=payload.competition_id,
        name=payload.name,
        abbreviation=payload.abbreviation,
        logo_url=payload.logo_url,
        auth_team_id=payload.auth_team_id,
        status=TeamStatus.ACTIVE,
        team_captain=None,
    )
    session.add(new_team)
    await session.flush()

    captain_player = None
    for player_data in payload.players:
        new_player = PlayerModel(
            team_id=new_team.id,
            keycloak_id=player_data.keycloak_id,
        )
        session.add(new_player)

        if player_data.keycloak_id == payload.captain_keycloak_id:
            captain_player = new_player

    await session.flush()

    if captain_player:
        new_team.team_captain = captain_player.id
        session.add(new_team)

    logger.info("Time '%s' criado com sucesso. ID: %s", payload.name, new_team.id)

    return TeamCreatedResponse(
        id=new_team.id,
        name=new_team.name,
        status=new_team.status.value if hasattr(new_team.status, "value") else str(new_team.status),
        competition_id=new_team.competition_id,
    )


async def sync_team_logo_by_id(
    session: AsyncSession, team_id: UUID, logo_url: Optional[str]
) -> None:
    """Atualiza apenas o escudo (auth → competitions via HTTP interno ou fila)."""
    team = await session.get(TeamModel, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado")
    team.logo_url = logo_url


async def _purge_competition_team_row(session: AsyncSession, team: TeamModel) -> None:
    """Remove uma linha de time e vínculos (classificação, jogos, jogadores)."""
    tid = team.id
    team.team_captain = None
    await session.flush()

    await session.execute(
        delete(ClassificationModel).where(ClassificationModel.team_id == tid)
    )
    await session.execute(
        update(MatchModel)
        .where(MatchModel.home_team_id == tid)
        .values(home_team_id=None)
    )
    await session.execute(
        update(MatchModel)
        .where(MatchModel.away_team_id == tid)
        .values(away_team_id=None)
    )
    await session.execute(
        update(MatchModel)
        .where(MatchModel.winner_team_id == tid)
        .values(winner_team_id=None)
    )
    await session.execute(delete(TeamInviteModel).where(TeamInviteModel.team_id == tid))
    await session.execute(delete(PlayerModel).where(PlayerModel.team_id == tid))
    await session.delete(team)
    await session.flush()


async def delete_team_by_auth_team_id(
    session: AsyncSession, auth_team_id: UUID
) -> list[UUID]:
    """
    Remove todo espelho do time no competitions (pode haver mais de uma linha por corrida na importação).
    Retorna os UUIDs de time no competitions removidos (para limpar social).

    Só permitido com competição ainda *pending*.
    """
    result = await session.execute(
        select(TeamModel).where(TeamModel.auth_team_id == auth_team_id)
    )
    teams = list(result.scalars().all())
    if not teams:
        raise HTTPException(status_code=404, detail="Time não encontrado nesta competição")

    competition = await session.get(CompetitionModel, teams[0].competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competição não encontrada")

    if competition.status != CompetitionStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail="A competição já começou ou foi encerrada; não é possível excluir o time.",
        )

    deleted_ids: list[UUID] = []
    for team in teams:
        if team.competition_id != competition.id:
            raise HTTPException(
                status_code=409,
                detail="Inconsistência: time ligado a mais de uma competição.",
            )
        tid = team.id
        await _purge_competition_team_row(session, team)
        deleted_ids.append(tid)

    logger.info(
        "Removido(s) %s registro(s) no competitions para auth_team_id=%s: %s",
        len(deleted_ids),
        auth_team_id,
        deleted_ids,
    )
    return deleted_ids


async def delete_team_by_competition_team_id(
    session: AsyncSession, competition_team_id: UUID
) -> list[UUID]:
    """
    Remove um time pelo ID no competitions-service (fallback quando by-auth não encontra linha).
    """
    team = await session.get(TeamModel, competition_team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado nesta competição")

    competition = await session.get(CompetitionModel, team.competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competição não encontrada")

    if competition.status != CompetitionStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail="A competição já começou ou foi encerrada; não é possível excluir o time.",
        )

    tid = team.id
    await _purge_competition_team_row(session, team)
    logger.info(
        "Time competition_team_id=%s removido do competitions-service (competição pending)",
        competition_team_id,
    )
    return [tid]
