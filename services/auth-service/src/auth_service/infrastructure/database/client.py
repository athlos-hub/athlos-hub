from typing import Any, AsyncGenerator, Dict, Optional

import logging
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from auth_service.infrastructure.database.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class DatabaseClient:
    def __init__(self):
        self._engine: Optional[AsyncEngine] = None
        self._session_maker: Optional[sessionmaker] = None

    def init(
        self,
        url: str,
        pool_min: int = 5,
        pool_max: int = 10,
        timeout: int = 30,
        connect_args: Dict[str, Any] = None,
    ):
        if self._engine is not None:
            return

        try:
            engine_kwargs: Dict[str, Any] = {
                "connect_args": connect_args or {},
                "echo": False,
                "pool_pre_ping": True,
                "pool_recycle": 1800,
            }

            if not url.startswith("sqlite"):
                engine_kwargs.update(
                    {
                        "pool_size": pool_min,
                        "max_overflow": pool_max - pool_min,
                        "pool_timeout": timeout,
                    }
                )

            self._engine = create_async_engine(url, **engine_kwargs)

            self._session_maker = sessionmaker(
                bind=self._engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )

            logger.info("DatabaseClient inicializado com sucesso.")

        except Exception as e:
            logger.exception("Falha ao inicializar DatabaseClient: %s", e)
            raise DatabaseError(f"Falha ao inicializar banco de dados: {e}")

    async def check_health(self):
        if not self._engine:
            raise DatabaseError("DB não inicializado")
        async with self._engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    async def close(self):
        if self._engine:
            await self._engine.dispose()
            self._engine = None

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        if self._session_maker is None:
            raise DatabaseError("DB não inicializado. Chame init() primeiro.")

        session = self._session_maker()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


db = DatabaseClient()
