import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_keycloak_id,
)
from src.routes.deps import get_session
from src.schemas import api_success, share_to_camel, spring_page
from src.services.interactions.interactions_service import (
    has_shared,
    list_my_shares,
    list_user_shares,
    share_count,
    share_post,
    unshare_post,
)

router = APIRouter(tags=["social"])


@router.post("/shares/{post_id}")
async def shares_create(
    post_id: uuid.UUID,
    body: dict[str, str] | None,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    comment = (body or {}).get("comment")
    sh = await share_post(session, post_id, kid, comment, authorization)
    return api_success(share_to_camel(sh))


@router.delete("/shares/{post_id}")
async def shares_delete(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    await unshare_post(session, post_id, kid)
    return api_success({"unshared": True})


@router.get("/shares/check/{post_id}")
async def shares_check(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
):
    if not kid:
        return api_success({"shared": False})
    ok = await has_shared(session, post_id, kid)
    return api_success({"shared": ok})


@router.get("/shares/my")
async def shares_my(
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_my_shares(session, kid, page, size)
    content = [share_to_camel(s, s.post) for s in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/shares/user/{keycloak_id}")
async def shares_user(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_user_shares(session, keycloak_id, page, size)
    content = [share_to_camel(s, s.post) for s in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/shares/count/{post_id}")
async def shares_count_route(post_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    n = await share_count(session, post_id)
    return api_success({"count": n})
