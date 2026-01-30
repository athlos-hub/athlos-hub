import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.modality import ModalityModel
from src.models.sport_ruleset import SportRulesetModel
from src.models.competition import CompetitionModel, CompetitionSystem, CompetitionStatus
from src.models.teams import TeamModel
from src.models.matches import RoundModel, MatchModel, MatchStatus, GroupModel

pytestmark = pytest.mark.asyncio


async def _seed_match_data(session: AsyncSession, org_code: str = "ORG1"):
    modality = ModalityModel(name="Futebol", org_code=org_code)
    ruleset = SportRulesetModel(
        name="Regras Básicas",
        segment_type="TIME",
        segments_regular_number=2,
        overtime_segments=0,
        penalty_segments=0,
        has_break_segments=True
    )
    now = datetime.now()
    competition = CompetitionModel(
        name="Competição X",
        modality=modality,
        sport_ruleset=ruleset,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS,
        status=CompetitionStatus.PENDING,
        min_members_per_team=1,
        max_members_per_team=5
    )
    session.add_all([modality, ruleset, competition])
    await session.commit()
    await session.refresh(competition)

    team_home = TeamModel(org_code=org_code, competition_id=competition.id, name="Time A", abbreviation="TA")
    team_away = TeamModel(org_code=org_code, competition_id=competition.id, name="Time B", abbreviation="TB")
    session.add_all([team_home, team_away])
    await session.commit()
    await session.refresh(team_home)
    await session.refresh(team_away)

    group = GroupModel(competition_id=competition.id, name="Grupo A")
    round_obj = RoundModel(competition_id=competition.id, name="Rodada 1")
    session.add_all([group, round_obj])
    await session.commit()
    await session.refresh(group)
    await session.refresh(round_obj)

    match = MatchModel(
        id=uuid.uuid4(),
        competition_id=competition.id,
        group_id=group.id,
        round_id=round_obj.id,
        round_number_match=1,
        home_team_id=team_home.id,
        away_team_id=team_away.id,
        scheduled_datetime=now + timedelta(days=1),
        local="Arena 1",
        status=MatchStatus.SCHEDULED,
        home_score=0,
        away_score=0
    )
    session.add(match)
    await session.commit()
    await session.refresh(match)

    return {
        "competition": competition,
        "team_home": team_home,
        "group": group,
        "round": round_obj,
        "match": match,
        "org_code": org_code
    }


async def test_list_organization_matches(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG3")

    response = await client.get(f"/api/v1/matches/organization/{data['org_code']}")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["competition_name"] == "Competição X"


async def test_list_competition_matches(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG4")

    response = await client.get(f"/api/v1/matches/competition/{data['competition'].id}")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["round"]["name"] == "Rodada 1"


async def test_list_team_matches(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG5")
    team_id = data["team_home"].id

    response = await client.get(f"/api/v1/matches/team/{team_id}/")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["home_team"]["id"] == str(team_id)


async def test_list_competition_rounds(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG6")

    response = await client.get(f"/api/v1/matches/competition/{data['competition'].id}/rounds")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["matches"][0]["round_match_number"] == 1


async def test_list_group_rounds(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG7")

    response = await client.get(f"/api/v1/matches/group/{data['group'].id}/rounds")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "Rodada 1"


async def test_list_organization_rounds(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG8")

    response = await client.get(f"/api/v1/matches/organization/{data['org_code']}/rounds")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["matches"][0]["competition_name"] == "Competição X"


async def test_update_match(client: AsyncClient, session: AsyncSession):
    data = await _seed_match_data(session, org_code="ORG9")

    new_datetime = (datetime.now().replace(microsecond=0) + timedelta(days=3)).isoformat()
    payload = {
        "scheduled_datetime": new_datetime,
        "local": "Arena 2"
    }

    response = await client.patch(f"/api/v1/matches/{data['match'].id}", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["local"] == "Arena 2"
    assert body["scheduled_datetime"] == new_datetime
