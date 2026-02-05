import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.modality_service import ModalityService
from src.schemas.modality_schema import ModalityCreateSchema
from src.models import ModalityModel

pytestmark = pytest.mark.asyncio


async def test_create_modality_success():
    """Testa criação de modalidade com sucesso"""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_auth_client = AsyncMock()
    mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
    mock_auth_client.__aexit__ = AsyncMock(return_value=None)
    mock_auth_client.check_organization_exists = AsyncMock(
        return_value={"exists": True}
    )
    
    service = ModalityService(mock_session, auth_client=mock_auth_client)

    modality_in = ModalityCreateSchema(name="Tênis", organization_slug="ATP")

    # Execução
    result = await service.create_modality(modality_in)

    # Verificações
    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
    
    assert isinstance(result, ModalityModel)
    assert result.name == "Tênis"
    assert result.organization_slug == "ATP"


async def test_create_modality_football():
    """Testa criação de modalidade Futebol"""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_auth_client = AsyncMock()
    mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
    mock_auth_client.__aexit__ = AsyncMock(return_value=None)
    mock_auth_client.check_organization_exists = AsyncMock(
        return_value={"exists": True}
    )
    
    service = ModalityService(mock_session, auth_client=mock_auth_client)

    modality_in = ModalityCreateSchema(name="Futebol", organization_slug="CBF")

    # Execução
    result = await service.create_modality(modality_in)

    # Verificações
    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
    
    assert result.name == "Futebol"
    assert result.organization_slug == "CBF"


async def test_get_all_modalities():
    """Testa listagem de todas as modalidades"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = ModalityService(mock_session)

    # Mock de modalidades
    mock_modalities = [
        ModalityModel(id=1, name="Futebol", organization_slug="ORG1"),
        ModalityModel(id=2, name="Basquete", organization_slug="ORG1"),
        ModalityModel(id=3, name="Vôlei", organization_slug="ORG2"),
    ]

    # Configurar mock corretamente para chamadas encadeadas assíncronas
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_modalities
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_all_modalities(offset=0, limit=10)

    # Verificações
    assert len(result) == 3
    assert result[0].name == "Futebol"
    assert result[1].name == "Basquete"
    assert result[2].organization_slug == "ORG2"
    mock_session.execute.assert_called_once()


async def test_get_all_modalities_with_pagination():
    """Testa listagem com paginação"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = ModalityService(mock_session)

    mock_modalities = [
        ModalityModel(id=11, name="Natação", organization_slug="ORG1"),
        ModalityModel(id=12, name="Atletismo", organization_slug="ORG1"),
    ]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_modalities
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_all_modalities(offset=10, limit=2)

    # Verificações
    assert len(result) == 2
    assert result[0].name == "Natação"
    assert result[1].name == "Atletismo"
    mock_session.execute.assert_called_once()


async def test_get_all_modalities_empty():
    """Testa listagem quando não há modalidades"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = ModalityService(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    # Execução
    result = await service.get_all_modalities()

    # Verificações
    assert len(result) == 0
    mock_session.execute.assert_called_once()


async def test_get_all_modalities_default_params():
    """Testa listagem com parâmetros padrão"""
    mock_session = AsyncMock(spec=AsyncSession)
    service = ModalityService(mock_session)

    mock_modalities = [
        ModalityModel(id=1, name="Futebol", organization_slug="ORG1"),
    ]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_modalities
    mock_session.execute.return_value = mock_result

    # Execução sem passar offset e limit (usa os padrões)
    result = await service.get_all_modalities()

    # Verificações
    assert len(result) == 1
    mock_session.execute.assert_called_once()
