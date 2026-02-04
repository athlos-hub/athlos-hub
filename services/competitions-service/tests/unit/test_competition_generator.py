import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from src.services.competition_generator.competition_generator import StructureGeneratorService
from src.services.competition_generator.end_group_phase import EndGroupPhaseService
from src.services.competition_generator.generate_league import GenerateLeagueCompetitionService
from src.models.competition import CompetitionModel, CompetitionStatus, CompetitionSystem
from src.models.matches import GroupModel, RoundModel, MatchModel, MatchStatus
from src.models.standings import ClassificationModel
from src.models.teams import TeamModel

pytestmark = pytest.mark.asyncio


async def test_structure_generator_points_calls_league():
    mock_session = AsyncMock(spec=AsyncSession)
    now = datetime.now()
    organization_id = uuid.uuid4()
    competition = CompetitionModel(
        id=1,
        name="Competicao",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS,
        status="PENDING"
    )
    competition.sport_ruleset = MagicMock()

    teams = [
        TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="Team A", abbreviation="A"),
        TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="Team B", abbreviation="B")
    ]

    mock_result_competition = MagicMock()
    mock_result_competition.scalar_one_or_none.return_value = competition

    mock_result_teams = MagicMock()
    mock_result_teams.scalars.return_value.all.return_value = teams

    # Mock para _get_competition_matches - retorna lista vazia de matches
    mock_matches_result = MagicMock()
    mock_matches_result.scalars.return_value.all.return_value = []

    mock_session.execute.side_effect = [
        mock_result_competition, 
        mock_result_teams,
        mock_matches_result  # Para _get_competition_matches
    ]

    # Mock do LivestreamClient
    mock_livestream_client = AsyncMock()
    mock_livestream_client.health_check = AsyncMock(return_value=True)
    mock_livestream_client.__aenter__ = AsyncMock(return_value=mock_livestream_client)
    mock_livestream_client.__aexit__ = AsyncMock(return_value=None)

    # Mock do LiveCreationService
    mock_live_service = MagicMock()
    mock_live_service.create_lives_for_matches = AsyncMock(return_value=[])

    with patch("src.services.competition_generator.competition_generator.initialize_standings", new=AsyncMock()) as mock_init, \
        patch("src.services.competition_generator.competition_generator.LeagueService.generate_league_system", new=AsyncMock()) as mock_generate, \
        patch("src.services.competition_generator.competition_generator.LivestreamClient", return_value=mock_livestream_client), \
        patch("src.services.competition_generator.competition_generator.LiveCreationService", return_value=mock_live_service):
        service = StructureGeneratorService(mock_session)
        result = await service.generate_structure(competition.id, organization_id)

    mock_init.assert_awaited_once()
    mock_generate.assert_awaited_once()
    mock_session.commit.assert_awaited_once()
    assert result["system"] == CompetitionSystem.POINTS
    assert competition.status == CompetitionStatus.STARTED


async def test_structure_generator_invalid_status():
    mock_session = AsyncMock(spec=AsyncSession)
    now = datetime.now()
    organization_id = uuid.uuid4()
    competition = CompetitionModel(
        id=2,
        name="Competicao",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS,
        status="STARTED"
    )
    competition.sport_ruleset = MagicMock()

    mock_result_competition = MagicMock()
    mock_result_competition.scalar_one_or_none.return_value = competition
    mock_session.execute.return_value = mock_result_competition

    service = StructureGeneratorService(mock_session)

    with pytest.raises(HTTPException) as exc_info:
        await service.generate_structure(competition.id, organization_id)

    assert exc_info.value.status_code == 400


async def test_end_group_phase_success_updates_matches():
    mock_session = AsyncMock(spec=AsyncSession)
    now = datetime.now()
    competition = CompetitionModel(
        id=1,
        name="Competicao",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.MIXED,
        status="PENDING"
    )
    competition.teams_qualified_per_group = 2

    group_a = GroupModel(id=1, competition_id=1, name="Grupo A")
    group_b = GroupModel(id=2, competition_id=1, name="Grupo B")

    team_a1 = TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="A1", abbreviation="A1")
    team_a2 = TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="A2", abbreviation="A2")
    team_b1 = TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="B1", abbreviation="B1")
    team_b2 = TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="B2", abbreviation="B2")

    class_a1 = ClassificationModel(group_id=group_a.id)
    class_a1.team = team_a1
    class_a2 = ClassificationModel(group_id=group_a.id)
    class_a2.team = team_a2

    class_b1 = ClassificationModel(group_id=group_b.id)
    class_b1.team = team_b1
    class_b2 = ClassificationModel(group_id=group_b.id)
    class_b2.team = team_b2

    round_obj = RoundModel(id=10, competition_id=1, name="Fase Final - Oitavas de Final")

    match1 = MatchModel(id=uuid.uuid4(), competition_id=1, round_id=10, round_number_match=1, status=MatchStatus.PENDING)
    match2 = MatchModel(id=uuid.uuid4(), competition_id=1, round_id=10, round_number_match=2, status=MatchStatus.PENDING)

    mock_result_competition = MagicMock()
    mock_result_competition.scalar_one_or_none.return_value = competition

    mock_result_groups = MagicMock()
    mock_result_groups.scalars.return_value.all.return_value = [group_a, group_b]

    mock_result_standings_a = MagicMock()
    mock_result_standings_a.scalars.return_value.all.return_value = [class_a1, class_a2]

    mock_result_standings_b = MagicMock()
    mock_result_standings_b.scalars.return_value.all.return_value = [class_b1, class_b2]

    mock_result_round = MagicMock()
    mock_result_round.scalar_one_or_none.return_value = round_obj

    mock_result_matches = MagicMock()
    mock_result_matches.scalars.return_value.all.return_value = [match1, match2]

    mock_session.execute.side_effect = [
        mock_result_competition,
        mock_result_groups,
        mock_result_standings_a,
        mock_result_standings_b,
        mock_result_round,
        mock_result_matches
    ]

    with patch("src.services.competition_generator.end_group_phase.util.get_elimination_round_names", return_value=["Oitavas de Final"], create=True):
        service = EndGroupPhaseService(mock_session)
        result = await service.advance_group_phase(competition.id)

    assert result["matches_updated"] == 2
    assert match1.home_team_id == team_a1.id
    assert match1.away_team_id == team_b2.id
    assert match2.home_team_id == team_b1.id
    assert match2.away_team_id == team_a2.id
    assert match1.status == MatchStatus.SCHEDULED
    assert match2.status == MatchStatus.SCHEDULED
    mock_session.commit.assert_awaited_once()


def test_create_clashes_rotates_seconds():
    service = EndGroupPhaseService(AsyncMock(spec=AsyncSession))

    group_a = GroupModel(id=1, competition_id=1, name="Grupo A")
    group_b = GroupModel(id=2, competition_id=1, name="Grupo B")

    clashes = service._create_clashes([group_a, group_b], qualified_per_group=2)

    assert clashes == [("1º Grupo A", "2º Grupo B"), ("1º Grupo B", "2º Grupo A")]


async def test_generate_league_system_creates_rounds_matches():
    mock_session = AsyncMock(spec=AsyncSession)
    service = GenerateLeagueCompetitionService(mock_session)

    now = datetime.now()
    competition = CompetitionModel(
        id=1,
        name="Competicao",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS,
        status="PENDING"
    )
    competition.sport_ruleset = MagicMock()

    teams = [
        TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="A", abbreviation="A"),
        TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="B", abbreviation="B"),
        TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="C", abbreviation="C"),
        TeamModel(id=uuid.uuid4(), competition_id=1, org_code="ORG", name="D", abbreviation="D")
    ]

    with patch("src.services.competition_generator.generate_league.util.create_segments_for_match", return_value=[], create=True):
        await service.generate_league_system(competition, teams)

    assert mock_session.add_all.call_count == 3

    rounds_arg = mock_session.add_all.call_args_list[0].args[0]
    matches_arg = mock_session.add_all.call_args_list[1].args[0]
    segments_arg = mock_session.add_all.call_args_list[2].args[0]

    assert len(rounds_arg) == 3
    assert len(matches_arg) == 6
    assert segments_arg == []
    mock_session.flush.assert_awaited_once()
