import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.modality_service import ModalityService
from src.schemas.modality_schema import ModalityCreateSchema
from src.models import ModalityModel

pytestmark = pytest.mark.asyncio

async def test_service_create_modality():
    mock_session = AsyncMock(spec=AsyncSession)
    service = ModalityService(mock_session)

    # 2. Dados de entrada
    modality_in = ModalityCreateSchema(name="Tênis", org_code="ATP")

    # 3. Execução
    result = await service.create_modality(modality_in)

    # 4. Verificações
    # Verifica se chamou session.add
    mock_session.add.assert_called_once()
    # Verifica se chamou session.flush (para gerar ID)
    mock_session.flush.assert_called_once()
    
    assert isinstance(result, ModalityModel)
    assert result.name == "Tênis"
    assert result.org_code == "ATP"
