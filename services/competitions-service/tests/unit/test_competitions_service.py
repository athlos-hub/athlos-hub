import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from datetime import datetime, timedelta

from src.services.competitions_service import CompetitionService
from src.schemas.competition_schema import CompetitionCreate, SportRulesetCreate
from src.models.competition import CompetitionModel, CompetitionStatus, CompetitionSystem
from src.models.modality import ModalityModel
from src.models.sport_ruleset import SportRulesetModel

pytestmark = pytest.mark.asyncio


async def test_create_competition_with_new_ruleset():
    """Testa criação de competição com novo ruleset"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    # Mock da modalidade existente
    mock_modality = ModalityModel(id=1, name="Futebol", organization_slug="ORG1")

    # Dados de entrada
    ruleset_data = SportRulesetCreate(
        name="Regras FIFA 2024",
        segment_type="TIME",
        segments_regular_number=2,
        overtime_segments=0,
        penalty_segments=0,
        has_break_segments=True
    )
    
    competition_data = CompetitionCreate(
        name="Campeonato Brasileiro",
        modality_id=1,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30),
        system=CompetitionSystem.POINTS,
        min_members_per_team=11,
        max_members_per_team=25,
        ruleset=ruleset_data
    )

    # Mock do novo ruleset
    new_ruleset = SportRulesetModel(id=1, **ruleset_data.model_dump())
    mock_session.flush.return_value = None
    
    # Mock da competição criada
    mock_competition = CompetitionModel(
        id=1,
        name="Campeonato Brasileiro",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=competition_data.start_date,
        end_date=competition_data.end_date,
        system=competition_data.system,
        min_members_per_team=competition_data.min_members_per_team,
        max_members_per_team=competition_data.max_members_per_team,
        status=CompetitionStatus.PENDING
    )

    # Configurar retornos sequenciais do execute
    mock_execute_results = [
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_modality)),  # Validação modalidade
        MagicMock(scalar_one=MagicMock(return_value=mock_competition))  # Refresh final
    ]
    mock_session.execute.side_effect = mock_execute_results

    # Execução
    result = await service.create(competition_data)

    # Verificações
    assert mock_session.add.call_count >= 2  # Ruleset + Competition
    mock_session.commit.assert_called_once()
    assert isinstance(result, CompetitionModel)
    assert result.name == "Campeonato Brasileiro"
    assert result.status == CompetitionStatus.PENDING


async def test_create_competition_with_existing_ruleset():
    """Testa criação de competição reutilizando ruleset existente"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    # Mocks
    mock_modality = ModalityModel(id=1, name="Futebol", organization_slug="ORG1")
    mock_existing_ruleset = SportRulesetModel(
        id=5,
        name="Regras FIFA",
        organization_slug="ORG1",
        segment_type="TIME",
        segments_regular_number=2,
        overtime_segments=0,
        penalty_segments=0,
        has_break_segments=True
    )
    
    competition_data = CompetitionCreate(
        name="Copa do Brasil",
        modality_id=1,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=60),
        system=CompetitionSystem.ELIMINATION,
        min_members_per_team=11,
        max_members_per_team=25,
        sport_ruleset_id=5
    )

    mock_competition = CompetitionModel(
        id=2,
        name="Copa do Brasil",
        modality_id=1,
        sport_ruleset_id=5,
        start_date=competition_data.start_date,
        end_date=competition_data.end_date,
        system=competition_data.system,
        min_members_per_team=competition_data.min_members_per_team,
        max_members_per_team=competition_data.max_members_per_team,
        status=CompetitionStatus.PENDING
    )

    # Configurar retornos
    mock_execute_results = [
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_modality)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_existing_ruleset)),
        MagicMock(scalar_one=MagicMock(return_value=mock_competition))
    ]
    mock_session.execute.side_effect = mock_execute_results

    # Execução
    result = await service.create(competition_data)

    # Verificações
    assert mock_session.add.call_count == 1  # Apenas competition, não cria ruleset
    mock_session.commit.assert_called_once()
    assert result.sport_ruleset_id == 5


async def test_create_competition_invalid_modality():
    """Testa erro quando modalidade não existe"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    # Modalidade não encontrada
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    competition_data = CompetitionCreate(
        name="Campeonato Inexistente",
        modality_id=999,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=10),
        min_members_per_team=5,
        max_members_per_team=15,
        sport_ruleset_id=1
    )

    # Execução e verificação
    with pytest.raises(HTTPException) as exc_info:
        await service.create(competition_data)
    
    assert exc_info.value.status_code == 404
    assert "Modalidade" in exc_info.value.detail


async def test_create_competition_invalid_ruleset_id():
    """Testa erro quando sport_ruleset_id informado não existe"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    mock_modality = ModalityModel(id=1, name="Futebol", organization_slug="ORG1")
    
    competition_data = CompetitionCreate(
        name="Campeonato Test",
        modality_id=1,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=10),
        min_members_per_team=5,
        max_members_per_team=15,
        sport_ruleset_id=999
    )

    # Primeiro retorno: modalidade OK, segundo: ruleset não encontrado
    mock_execute_results = [
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_modality)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    ]
    mock_session.execute.side_effect = mock_execute_results

    # Execução e verificação
    with pytest.raises(HTTPException) as exc_info:
        await service.create(competition_data)
    
    assert exc_info.value.status_code == 404
    assert "Ruleset" in exc_info.value.detail


async def test_list_all_competitions():
    """Testa listagem de competições"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    # Mocks de competições
    now = datetime.now()
    mock_competitions = [
        CompetitionModel(id=1, name="Comp 1", modality_id=1, sport_ruleset_id=1, start_date=now, end_date=now, system=CompetitionSystem.POINTS),
        CompetitionModel(id=2, name="Comp 2", modality_id=1, sport_ruleset_id=1, start_date=now, end_date=now, system=CompetitionSystem.POINTS),
        CompetitionModel(id=3, name="Comp 3", modality_id=2, sport_ruleset_id=2, start_date=now, end_date=now, system=CompetitionSystem.POINTS),
    ]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_competitions
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.list_all(skip=0, limit=100)

    # Verificações
    assert len(result) == 3
    assert result[0].name == "Comp 1"
    assert result[2].modality_id == 2
    mock_session.execute.assert_called_once()


async def test_list_all_competitions_with_pagination():
    """Testa listagem com paginação"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    now = datetime.now()
    mock_competitions = [
        CompetitionModel(id=6, name="Comp 6", modality_id=1, sport_ruleset_id=1, start_date=now, end_date=now, system=CompetitionSystem.POINTS),
        CompetitionModel(id=7, name="Comp 7", modality_id=1, sport_ruleset_id=1, start_date=now, end_date=now, system=CompetitionSystem.POINTS),
    ]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_competitions
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.list_all(skip=5, limit=2)

    # Verificações
    assert len(result) == 2
    mock_session.execute.assert_called_once()


async def test_get_by_id_success():
    """Testa busca de competição por ID com sucesso"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    now = datetime.now()
    mock_competition = CompetitionModel(
        id=1,
        name="Campeonato Teste",
        modality_id=1,
        sport_ruleset_id=1,
        start_date=now,
        end_date=now,
        system=CompetitionSystem.POINTS,
        status=CompetitionStatus.STARTED
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_competition
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_by_id(1)

    # Verificações
    assert result.id == 1
    assert result.name == "Campeonato Teste"
    assert result.status == CompetitionStatus.STARTED
    mock_session.execute.assert_called_once()


async def test_get_by_id_not_found():
    """Testa erro quando competição não existe"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = CompetitionService(mock_session)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    # Execução e verificação
    with pytest.raises(HTTPException) as exc_info:
        await service.get_by_id(999)
    
    assert exc_info.value.status_code == 404
    assert "não encontrada" in exc_info.value.detail
