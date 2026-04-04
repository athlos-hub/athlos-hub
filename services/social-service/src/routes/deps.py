from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from shared.database.client import db


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with db.session() as session:
        yield session
