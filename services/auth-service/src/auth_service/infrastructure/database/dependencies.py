from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.infrastructure.database.client import db


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with db.session() as session:
        yield session
