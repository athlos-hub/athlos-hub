import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from src.services.rounds_service import RoundsService
from src.models.matches import RoundModel, MatchModel, MatchStatus
from src.models.competition import CompetitionModel, CompetitionSystem
from src.models.modality import ModalityModel
from src.models.teams import TeamModel

pytestmark = pytest.mark.asyncio


@pytest.fixture
def sample_round_with_matches():
    """Fixture que retorna uma rodada com matches"""
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
    
    round_obj = RoundModel(id=1, competition_id=1, name="Rodada 1")
    
    home_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Time A", abbreviation="TMA")
    away_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Time B", abbreviation="TMB")
    
    match1 = MatchModel(
        id=uuid.uuid4(),
        competition_id=1,
        round_id=1,
        round_number_match=1,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        scheduled_datetime=datetime.now(),
        local="Estádio A",
        status=MatchStatus.SCHEDULED,
        home_score=0,
        away_score=0
    )
    match1.round_match_number = match1.round_number_match
    match1.competition = competition
    match1.home_team = home_team
    match1.away_team = away_team
    
    match2 = MatchModel(
        id=uuid.uuid4(),
        competition_id=1,
        round_id=1,
        round_number_match=2,
        home_team_id=uuid.uuid4(),
        away_team_id=uuid.uuid4(),
        scheduled_datetime=datetime.now(),
        local="Estádio B",
        status=MatchStatus.SCHEDULED,
        home_score=0,
        away_score=0
    )
    match2.round_match_number = match2.round_number_match
    match2.competition = competition
    match2.home_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Time C", abbreviation="TMC")
    match2.away_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Time D", abbreviation="TMD")
    
    round_obj.matches = [match1, match2]
    
    return round_obj


async def test_get_rounds_by_competition(sample_round_with_matches):
    """Testa busca de rodadas por competição"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_round_with_matches]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_competition(1)

    # Verificações
    assert len(result) == 1
    assert result[0]["id"] == 1
    assert result[0]["name"] == "Rodada 1"
    assert len(result[0]["matches"]) == 2
    assert result[0]["matches"][0]["competition_name"] == "Campeonato Teste"
    assert result[0]["matches"][0]["modality_name"] == "Futebol"
    assert result[0]["matches"][0]["local"] == "Estádio A"
    mock_session.execute.assert_called_once()


async def test_get_rounds_by_competition_empty():
    """Testa quando não há rodadas"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_competition(999)

    # Verificações
    assert len(result) == 0
    mock_session.execute.assert_called_once()


async def test_get_rounds_by_group(sample_round_with_matches):
    """Testa busca de rodadas por grupo"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

    # Adicionar group_id aos matches
    for match in sample_round_with_matches.matches:
        match.group_id = 1

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_round_with_matches]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_group(1)

    # Verificações
    assert len(result) == 1
    assert result[0]["name"] == "Rodada 1"
    assert len(result[0]["matches"]) == 2
    mock_session.execute.assert_called_once()


async def test_get_rounds_by_org(sample_round_with_matches):
    """Testa busca de rodadas por organização"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

    round2 = RoundModel(id=2, competition_id=1, name="Rodada 2")
    round2.matches = []
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [
        sample_round_with_matches,
        round2
    ]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_org("ORG1")

    # Verificações
    assert len(result) == 2
    assert result[0]["name"] == "Rodada 1"
    assert result[1]["name"] == "Rodada 2"
    assert len(result[0]["matches"]) == 2
    assert len(result[1]["matches"]) == 0
    mock_session.execute.assert_called_once()


async def test_format_response_multiple_rounds():
    """Testa formatação com múltiplas rodadas"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

    now = datetime.now()
    competition = CompetitionModel(
        id=1,
        name="Campeonato",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS
    )
    modality = ModalityModel(id=1, name="Futebol", org_code="ORG1")
    competition.modality = modality

    # Rodada 1 com 2 matches
    round1 = RoundModel(id=1, competition_id=1, name="Rodada 1")
    match1 = MatchModel(
        id=uuid.uuid4(),
        competition_id=1,
        round_id=1,
        round_number_match=1,
        status=MatchStatus.SCHEDULED,
        home_score=0,
        away_score=0
    )
    match1.round_match_number = match1.round_number_match
    match1.competition = competition
    match1.home_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Team A", abbreviation="TMA")
    match1.away_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Team B", abbreviation="TMB")
    round1.matches = [match1]

    # Rodada 2 com 1 match
    round2 = RoundModel(id=2, competition_id=1, name="Rodada 2")
    match2 = MatchModel(
        id=uuid.uuid4(),
        competition_id=1,
        round_id=2,
        round_number_match=1,
        status=MatchStatus.LIVE,
        home_score=2,
        away_score=1
    )
    match2.round_match_number = match2.round_number_match
    match2.competition = competition
    match2.home_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Team C", abbreviation="TMC")
    match2.away_team = TeamModel(id=uuid.uuid4(), org_code="ORG1", competition_id=1, name="Team D", abbreviation="TMD")
    round2.matches = [match2]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [round1, round2]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_competition(1)

    # Verificações
    assert len(result) == 2
    assert result[0]["id"] == 1
    assert result[1]["id"] == 2
    assert len(result[0]["matches"]) == 1
    assert len(result[1]["matches"]) == 1
    assert result[1]["matches"][0]["status"] == MatchStatus.LIVE
    assert result[1]["matches"][0]["home_score"] == 2
    assert result[1]["matches"][0]["away_score"] == 1


async def test_format_response_with_none_teams():
    """Testa formatação com times None (TBD)"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

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

    round_obj = RoundModel(id=1, competition_id=1, name="Final")
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
    round_obj.matches = [match_tbd]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [round_obj]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_competition(1)

    # Verificações
    assert len(result) == 1
    assert result[0]["matches"][0]["home_team"] is None
    assert result[0]["matches"][0]["away_team"] is None


async def test_rounds_ordering():
    """Testa se as rodadas são retornadas ordenadas"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = RoundsService(mock_session)

    round3 = RoundModel(id=3, competition_id=1, name="Rodada 3")
    round1 = RoundModel(id=1, competition_id=1, name="Rodada 1")
    round2 = RoundModel(id=2, competition_id=1, name="Rodada 2")
    
    for r in [round1, round2, round3]:
        r.matches = []

    # Retornar propositalmente fora de ordem
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [round3, round1, round2]
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_rounds_by_competition(1)

    # Verificações básicas
    assert len(result) == 3
