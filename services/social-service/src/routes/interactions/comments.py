import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_bearer_authorization, get_current_keycloak_id
from src.routes.deps import get_session
from src.schemas import api_success, comment_to_camel, spring_page
from src.services.interactions.interactions_service import (
    add_comment,
    delete_comment,
    list_comments,
    update_comment,
)

router = APIRouter(tags=["social"])


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
async def comment_create(
    post_id: uuid.UUID,
    body: dict[str, str],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    c = await add_comment(
        session, post_id, kid, str(body.get("content") or ""), authorization
    )
    return api_success(comment_to_camel(c))


@router.get("/posts/{post_id}/comments")
async def comment_list(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_comments(session, post_id, page, size)
    content = [comment_to_camel(c) for c in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.put("/posts/{post_id}/comments/{comment_id}")
async def comment_update(
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    body: dict[str, str],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    c = await update_comment(
        session, post_id, comment_id, kid, str(body.get("content") or "")
    )
    return api_success(comment_to_camel(c))


@router.delete("/posts/{post_id}/comments/{comment_id}")
async def comment_delete(
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    await delete_comment(session, post_id, comment_id, kid)
    return api_success(None)
