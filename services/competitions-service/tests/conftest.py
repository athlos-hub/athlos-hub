import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.app import create_app
from src.models.base import Base
from src.routes.routes import get_session

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(name="session")
async def session_fixture() -> AsyncSession:
    """
    Cria uma sessão de banco de dados isolada para cada teste.
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool, # Mantém dados em memória
    )
    
    # Cria as tabelas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Fábrica de sessões
    TestingSessionLocal = sessionmaker(
        bind=engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )

    async with TestingSessionLocal() as session:
        yield session

    # Limpeza após o teste
    await engine.dispose()

@pytest_asyncio.fixture(name="client")
async def client_fixture(session: AsyncSession):
    """
    Cria um cliente HTTP (simula o navegador/Postman) e 
    injeta a sessão de teste no lugar da sessão real.
    """
    app = create_app()

    # OVERRIDE: Diz ao FastAPI para usar nossa sessão de teste em vez da real
    app.dependency_overrides[get_session] = lambda: session

    # Cria o cliente async
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client