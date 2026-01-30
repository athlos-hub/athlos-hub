import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.models.modality import ModalityModel
from src.models.sport_ruleset import SportRulesetModel
from src.models.competition import CompetitionModel, CompetitionStatus, CompetitionSystem
from src.models.teams import TeamModel
from src.models.matches import RoundModel, MatchModel

pytestmark = pytest.mark.asyncio


async def _create_modality(session: AsyncSession, org_code: str = "ORG1") -> ModalityModel:
    modality = ModalityModel(name="Futebol", org_code=org_code)
    session.add(modality)
    await session.commit()
    await session.refresh(modality)
    return modality


async def _create_ruleset(session: AsyncSession) -> SportRulesetModel:
    ruleset = SportRulesetModel(
        name="Regras Básicas",
        segment_type="TIME",
        segments_regular_number=2,
        overtime_segments=0,
        penalty_segments=0,
        has_break_segments=True
    )
    session.add(ruleset)
    await session.commit()
    await session.refresh(ruleset)
    return ruleset


async def test_create_list_get_competitions(client: AsyncClient, session: AsyncSession):
    modality = await _create_modality(session)

    payload = {
        "name": "Campeonato A",
        "modality_id": modality.id,
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=10)).isoformat(),
        "system": "points",
        "min_members_per_team": 5,
        "max_members_per_team": 11,
        "ruleset": {
            "name": "Regras Padrão",
            "segment_type": "TIME",
            "segments_regular_number": 2,
            "overtime_segments": 0,
            "penalty_segments": 0,
            "has_break_segments": True
        }
    }

    response = await client.post("/api/v1/competitions/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Campeonato A"
    assert data["modality_id"] == modality.id
    assert "id" in data

    ruleset_id = data["sport_ruleset_id"]
    payload_reuse = {
        "name": "Campeonato B",
        "modality_id": modality.id,
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=20)).isoformat(),
        "system": "points",
        "min_members_per_team": 5,
        "max_members_per_team": 11,
        "sport_ruleset_id": ruleset_id
    }

    response_reuse = await client.post("/api/v1/competitions/", json=payload_reuse)
    assert response_reuse.status_code == 201

    list_response = await client.get("/api/v1/competitions/")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data) == 2

    comp_id = data["id"]
    get_response = await client.get(f"/api/v1/competitions/{comp_id}")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["id"] == comp_id


async def test_generate_structure_endpoint(client: AsyncClient, session: AsyncSession):
    modality = await _create_modality(session, org_code="ORG2")
    ruleset = await _create_ruleset(session)

    now = datetime.now()
    competition = CompetitionModel(
        name="Liga",
        modality_id=modality.id,
        sport_ruleset_id=ruleset.id,
        start_date=now,
        end_date=now + timedelta(days=10),
        system=CompetitionSystem.POINTS,
        status=CompetitionStatus.PENDING,
        min_members_per_team=1,
        max_members_per_team=5
    )
    session.add(competition)
    await session.commit()
    await session.refresh(competition)

    team_a = TeamModel(org_code="ORG2", competition_id=competition.id, name="Time A", abbreviation="TA")
    team_b = TeamModel(org_code="ORG2", competition_id=competition.id, name="Time B", abbreviation="TB")
    session.add_all([team_a, team_b])
    await session.commit()

    response = await client.post(f"/api/v1/competitions/{competition.id}/generate-structure")
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Estrutura gerada com sucesso"

    rounds_result = await session.execute(select(RoundModel).where(RoundModel.competition_id == competition.id))
    matches_result = await session.execute(select(MatchModel).where(MatchModel.competition_id == competition.id))
    assert len(rounds_result.scalars().all()) > 0
    assert len(matches_result.scalars().all()) > 0

    await session.refresh(competition)
    assert str(competition.status).upper() == "STARTED"
