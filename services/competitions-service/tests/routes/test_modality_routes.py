import pytest
from httpx import AsyncClient

# Marca todos os testes como async
pytestmark = pytest.mark.asyncio

async def test_create_modality(client: AsyncClient):
    """
    Teste de criação de modalidade via endpoint POST /modalities/
    """
    
    payload = {
        "name": "Vôlei",
        "org_code": "IFCE"
    }

    response = await client.post("/modalities/", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Vôlei"
    assert "id" in data
    assert isinstance(data["id"], int)

async def test_list_modalities(client: AsyncClient):
    """
    Teste de listagem de modalidades via endpoint GET /modalities/
    """

    await client.post("/modalities/", json={"name": "Futsal", "org_code": "IFCE"})
    await client.post("/modalities/", json={"name": "Basquete", "org_code": "IFCE"})

    response = await client.get("/modalities/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Futsal"