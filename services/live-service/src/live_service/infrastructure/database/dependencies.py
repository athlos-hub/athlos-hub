from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.infrastructure.database.client import db


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with db.session() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
