"""Testes unitários para o TeamsService com validação de membros."""

import pytest
import pytest_asyncio
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from src.models.base import Base
from src.models.competition import CompetitionModel, CompetitionStatus, CompetitionType
from src.models.modality import ModalityModel
from src.models.teams import TeamModel, PlayerModel, TeamStatus
from src.schemas.teams_schema import TeamCreateSchema, PlayerCreateSchema
from src.services.teams_service import TeamService
from src.services.auth_client import (
    AuthClient,
    AuthServiceUnavailable,
    MemberValidationFailed,
    OrganizationNotFound,
)


@pytest_asyncio.fixture
async def db_session():
    """Cria uma sessão de banco de dados isolada para cada teste."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with TestingSessionLocal() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def modality(db_session: AsyncSession):
    """Cria uma modalidade de teste."""
    modality = ModalityModel(
        id=1,
        name="Futebol",
        description="Futebol de campo",
        organization_slug="test-org"
    )
    db_session.add(modality)
    await db_session.commit()
    await db_session.refresh(modality)
    return modality


@pytest_asyncio.fixture
async def competition(db_session: AsyncSession, modality: ModalityModel):
    """Cria uma competição de teste."""
    competition = CompetitionModel(
        id=1,
        name="Campeonato Teste",
        organization_slug="test-org",
        modality_id=modality.id,
        status=CompetitionStatus.PENDING,
        competition_type=CompetitionType.LEAGUE,
        min_teams=2,
        max_teams=16,
        min_members_per_team=1,
        max_members_per_team=11,
    )
    db_session.add(competition)
    await db_session.commit()
    await db_session.refresh(competition)
    return competition


@pytest.fixture
def mock_auth_client():
    """Mock do AuthClient."""
    return AsyncMock(spec=AuthClient)


class TestTeamServiceMemberValidation:
    """Testes para validação de membros no TeamsService."""

    @pytest.mark.asyncio
    async def test_create_team_validates_members_success(
        self, db_session: AsyncSession, competition: CompetitionModel, mock_auth_client
    ):
        """Testa criação de time quando todos os membros são válidos."""
        user_id_1 = uuid4()
        user_id_2 = uuid4()
        
        # Mock do auth client para retornar sucesso
        mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
        mock_auth_client.__aexit__ = AsyncMock(return_value=None)
        mock_auth_client.validate_organization_members = AsyncMock(return_value={
            "all_valid": True,
            "valid_count": 2,
            "results": []
        })
        
        service = TeamService(db_session, auth_client=mock_auth_client)
        
        team_data = TeamCreateSchema(
            organization_slug="test-org",
            competition_id=competition.id,
            name="Time Teste",
            abbreviation="TST",
            captain_user_id=user_id_1,
            players=[
                PlayerCreateSchema(user_id=user_id_1),
                PlayerCreateSchema(user_id=user_id_2),
            ]
        )
        
        team = await service.create_team(team_data)
        
        assert team is not None
        assert team.name == "Time Teste"
        assert len(team.players) == 2
        
        # Verifica que a validação foi chamada
        mock_auth_client.validate_organization_members.assert_called_once_with(
            organization_slug="test-org",
            user_ids=[user_id_1, user_id_2]
        )

    @pytest.mark.asyncio
    async def test_create_team_fails_when_members_invalid(
        self, db_session: AsyncSession, competition: CompetitionModel, mock_auth_client
    ):
        """Testa que criação falha quando membros não são válidos."""
        user_id_1 = uuid4()
        user_id_2 = uuid4()
        
        mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
        mock_auth_client.__aexit__ = AsyncMock(return_value=None)
        mock_auth_client.validate_organization_members = AsyncMock(
            side_effect=MemberValidationFailed(
                "Validação falhou",
                invalid_users=[
                    {"user_id": str(user_id_2), "username": "user2", "error": "Não é membro"}
                ]
            )
        )
        
        service = TeamService(db_session, auth_client=mock_auth_client)
        
        team_data = TeamCreateSchema(
            organization_slug="test-org",
            competition_id=competition.id,
            name="Time Teste",
            abbreviation="TST",
            captain_user_id=user_id_1,
            players=[
                PlayerCreateSchema(user_id=user_id_1),
                PlayerCreateSchema(user_id=user_id_2),
            ]
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await service.create_team(team_data)
        
        assert exc_info.value.status_code == 400
        assert "membros válidos" in str(exc_info.value.detail["message"])

    @pytest.mark.asyncio
    async def test_create_team_fails_when_organization_not_found(
        self, db_session: AsyncSession, competition: CompetitionModel, mock_auth_client
    ):
        """Testa que criação falha quando organização não existe."""
        user_id = uuid4()
        
        mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
        mock_auth_client.__aexit__ = AsyncMock(return_value=None)
        mock_auth_client.validate_organization_members = AsyncMock(
            side_effect=OrganizationNotFound("Organização não encontrada")
        )
        
        service = TeamService(db_session, auth_client=mock_auth_client)
        
        team_data = TeamCreateSchema(
            organization_slug="nonexistent-org",
            competition_id=competition.id,
            name="Time Teste",
            abbreviation="TST",
            captain_user_id=user_id,
            players=[PlayerCreateSchema(user_id=user_id)]
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await service.create_team(team_data)
        
        assert exc_info.value.status_code == 404
        assert "não encontrada" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_team_fails_when_auth_service_unavailable(
        self, db_session: AsyncSession, competition: CompetitionModel, mock_auth_client
    ):
        """Testa que criação falha graciosamente quando auth service está indisponível."""
        user_id = uuid4()
        
        mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
        mock_auth_client.__aexit__ = AsyncMock(return_value=None)
        mock_auth_client.validate_organization_members = AsyncMock(
            side_effect=AuthServiceUnavailable("Serviço indisponível")
        )
        
        service = TeamService(db_session, auth_client=mock_auth_client)
        
        team_data = TeamCreateSchema(
            organization_slug="test-org",
            competition_id=competition.id,
            name="Time Teste",
            abbreviation="TST",
            captain_user_id=user_id,
            players=[PlayerCreateSchema(user_id=user_id)]
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await service.create_team(team_data)
        
        assert exc_info.value.status_code == 503
        assert "temporariamente indisponível" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_team_validates_before_creating_team(
        self, db_session: AsyncSession, competition: CompetitionModel, mock_auth_client
    ):
        """Testa que validação ocorre antes da criação do time no banco."""
        user_id = uuid4()
        
        mock_auth_client.__aenter__ = AsyncMock(return_value=mock_auth_client)
        mock_auth_client.__aexit__ = AsyncMock(return_value=None)
        mock_auth_client.validate_organization_members = AsyncMock(
            side_effect=MemberValidationFailed(
                "Validação falhou",
                invalid_users=[{"user_id": str(user_id), "error": "Usuário não existe"}]
            )
        )
        
        service = TeamService(db_session, auth_client=mock_auth_client)
        
        team_data = TeamCreateSchema(
            organization_slug="test-org",
            competition_id=competition.id,
            name="Time Que Nao Deve Existir",
            abbreviation="NDE",
            captain_user_id=user_id,
            players=[PlayerCreateSchema(user_id=user_id)]
        )
        
        with pytest.raises(HTTPException):
            await service.create_team(team_data)
        
        # Verifica que nenhum time foi criado no banco
        from sqlalchemy import select
        result = await db_session.execute(
            select(TeamModel).where(TeamModel.name == "Time Que Nao Deve Existir")
        )
        assert result.scalar_one_or_none() is None
