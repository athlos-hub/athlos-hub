from fastapi import APIRouter, Depends
import logging
from typing import List
from uuid import UUID
from sqlalchemy import select
from ..models.user import User
from ..schemas.user import UserPublic, UserAdmin
from database.dependencies import get_session
from ..core.exceptions import UserNotFoundError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", dependencies=[Depends(require_role(["admin"]))], response_model=List[UserAdmin])
async def get_users_admin(session: AsyncSession = Depends(get_session)):
    users = await session.execute(select(User))
    return users.scalars().all()


@router.get("/{user_id}", response_model=UserPublic)
async def get_user_by_id(user_id: UUID,
                         session: AsyncSession = Depends(get_session)):

    user = await session.get(User, user_id)

    if not user or not user.enabled:
        raise UserNotFoundError(str(user_id))

    return user
