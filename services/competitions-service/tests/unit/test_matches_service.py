import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from fastapi import HTTPException

from src.services.matches_service import MatchesService
from src.schemas.matches_schema import MatchPeriodFilter, MatchUpdateRequest
from src.models.matches import MatchModel, MatchStatus
from src.models.competition import CompetitionModel, CompetitionSystem
from src.models.modality import ModalityModel
from src.models.teams import TeamModel

pytestmark = pytest.mark.asyncio


@pytest.fixture
def sample_match():
    """Fixture que retorna um match de exemplo"""
    now = datetime.now()
    competition = CompetitionModel(
        id=1,
        name="Campeonato Teste",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS
    )
    modality = ModalityModel(id=1, name="Futebol", org_code="ORG1")
    competition.modality = modality
    
    home_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Time A", abbreviation="TMA")
    away_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Time B", abbreviation="TMB")
    
    match = MatchModel(
        id=uuid.uuid4(),
        competition_id=1,
        round_id=1,
        round_number_match=1,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        scheduled_datetime=datetime.now() + timedelta(days=1),
        local="Estádio Teste",
        status=MatchStatus.SCHEDULED,
        home_score=0,
        away_score=0
    )
    
    match.competition = competition
    match.home_team = home_team
    match.away_team = away_team
    match.round_match_number = match.round_number_match
    
    return match


async def test_get_matches_by_org_all(sample_match):
    """Testa busca de matches por organização sem filtro de período"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_match]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_org("ORG1", MatchPeriodFilter.ALL)

    # Verificações
    assert len(result) == 1
    assert result[0]["competition_name"] == "Campeonato Teste"
    assert result[0]["modality_name"] == "Futebol"
    assert result[0]["status"] == MatchStatus.SCHEDULED
    assert result[0]["local"] == "Estádio Teste"
    mock_session.execute.assert_called_once()


async def test_get_matches_by_org_today(sample_match):
    """Testa busca de matches de hoje"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    # Ajustar data do match para hoje
    sample_match.scheduled_datetime = datetime.now()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_match]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_org("ORG1", MatchPeriodFilter.TODAY)

    # Verificações
    assert len(result) == 1
    mock_session.execute.assert_called_once()


async def test_get_matches_by_org_week(sample_match):
    """Testa busca de matches da semana"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    # Ajustar data para esta semana
    sample_match.scheduled_datetime = datetime.now() + timedelta(days=2)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_match]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_org("ORG1", MatchPeriodFilter.WEEK)

    # Verificações
    assert len(result) == 1
    mock_session.execute.assert_called_once()


async def test_get_matches_by_competition(sample_match):
    """Testa busca de matches por competição"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_match]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_competition(1, MatchPeriodFilter.ALL)

    # Verificações
    assert len(result) == 1
    assert isinstance(result[0], MatchModel)
    assert result[0].competition_id == 1
    mock_session.execute.assert_called_once()


async def test_get_matches_by_team(sample_match):
    """Testa busca de matches por time"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    team_id = sample_match.home_team_id
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_match]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_team(team_id, MatchPeriodFilter.ALL)

    # Verificações
    assert len(result) == 1
    mock_session.execute.assert_called_once()


async def test_get_matches_empty_result():
    """Testa quando não há matches"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_org("ORG_EMPTY", MatchPeriodFilter.ALL)

    # Verificações
    assert len(result) == 0
    mock_session.execute.assert_called_once()


async def test_update_match_details_success():
    """Testa atualização de data e local do match"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    match_id = uuid.uuid4()
    existing_match = MatchModel(
        id=match_id,
        competition_id=1,
        round_id=1,
        round_number_match=1,
        status=MatchStatus.SCHEDULED,
        scheduled_datetime=datetime.now() + timedelta(days=1),
        local="Estádio Velho"
    )
    existing_match.round_match_number = existing_match.round_number_match

    new_datetime = datetime.now() + timedelta(days=5)
    update_data = MatchUpdateRequest(
        scheduled_datetime=new_datetime,
        local="Estádio Novo"
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_match
    mock_result_refresh = MagicMock()
    mock_result_refresh.scalar_one.return_value = existing_match
    mock_session.execute.side_effect = [mock_result, mock_result_refresh]

    # Execução
    result = await service.update_match_details(match_id, update_data)

    # Verificações
    assert result.scheduled_datetime == new_datetime
    assert result.local == "Estádio Novo"
    mock_session.commit.assert_called_once()


async def test_update_match_not_found():
    """Testa erro quando match não existe"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    match_id = uuid.uuid4()
    update_data = MatchUpdateRequest(local="Novo Local")

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    # Execução e verificação
    with pytest.raises(HTTPException) as exc_info:
        await service.update_match_details(match_id, update_data)
    
    assert exc_info.value.status_code == 404


async def test_update_match_invalid_past_date():
    """Testa erro ao tentar agendar jogo no passado"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    match_id = uuid.uuid4()
    existing_match = MatchModel(
        id=match_id,
        competition_id=1,
        round_id=1,
        round_number_match=1,
        status=MatchStatus.SCHEDULED
    )
    existing_match.round_match_number = existing_match.round_number_match

    past_datetime = datetime.now() - timedelta(days=1)
    update_data = MatchUpdateRequest(scheduled_datetime=past_datetime)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_match
    mock_session.execute.return_value = mock_result

    # Execução e verificação
    with pytest.raises(HTTPException) as exc_info:
        await service.update_match_details(match_id, update_data)
    
    assert exc_info.value.status_code == 400
    assert "passado" in exc_info.value.detail.lower()


async def test_format_response_with_null_teams():
    """Testa formatação quando times são None (TBD)"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = MatchesService(mock_session)

    now = datetime.now()
    competition = CompetitionModel(
        id=1,
        name="Copa",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS
    )
    modality = ModalityModel(id=1, name="Futebol", org_code="ORG1")
    competition.modality = modality

    match_tbd = MatchModel(
        id=uuid.uuid4(),
        competition_id=1,
        round_id=1,
        round_number_match=1,
        home_team_id=None,
        away_team_id=None,
        status=MatchStatus.SCHEDULED,
        home_score=0,
        away_score=0
    )
    match_tbd.round_match_number = match_tbd.round_number_match
    
    match_tbd.competition = competition
    match_tbd.home_team = None
    match_tbd.away_team = None

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [match_tbd]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_matches_by_org("ORG1", MatchPeriodFilter.ALL)

    # Verificações
    assert len(result) == 1
    assert result[0]["home_team"] is None
    assert result[0]["away_team"] is None
    assert result[0]["competition_name"] == "Copa"
