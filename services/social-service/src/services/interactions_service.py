from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.infrastructure.http import auth_client
from src.infrastructure.moderation.openai_client import assert_content_allowed
from src.infrastructure.notifications import send_notification
from src.models import Comment, Like, Post, Share


async def toggle_like(
    session: AsyncSession, post_id: uuid.UUID, keycloak_id: str, authorization: str
) -> bool:
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post não encontrado")

    existing = await session.scalar(
        select(Like).where(Like.post_id == post_id, Like.keycloak_id == keycloak_id)
    )
    if existing:
        await session.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        return False

    session.add(Like(post_id=post_id, keycloak_id=keycloak_id))
    post.likes_count = post.likes_count + 1

    author = post.created_by_keycloak_id
    if author and author != "SYSTEM" and author != keycloak_id:
        rid = await auth_client.resolve_internal_user_id(author, authorization)
        if rid:
            try:
                actor = await auth_client.get_user_by_keycloak_id(keycloak_id, authorization)
                name = actor.get("full_name") or actor.get("username") or "Usuário"
            except Exception:
                name = "Usuário"
            await send_notification(
                recipient_internal_user_id=str(rid),
                actor_keycloak_id=keycloak_id,
                notification_type="post_like",
                title=f"{name} curtiu seu post",
                message=f"{name} curtiu seu post",
                extra_data={"actorName": name, "postContent": post.content},
                entity_id=post_id,
            )
    return True


async def is_liked(session: AsyncSession, post_id: uuid.UUID, keycloak_id: str) -> bool:
    q = await session.scalar(
        select(func.count())
        .select_from(Like)
        .where(Like.post_id == post_id, Like.keycloak_id == keycloak_id)
    )
    return bool(q)


async def add_comment(
    session: AsyncSession,
    post_id: uuid.UUID,
    keycloak_id: str,
    content: str,
    authorization: str,
) -> Comment:
    await assert_content_allowed(content)

    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post não encontrado")

    c = Comment(post_id=post_id, keycloak_id=keycloak_id, content=content)
    session.add(c)
    await session.flush()
    post.comments_count = post.comments_count + 1

    author = post.created_by_keycloak_id
    if author and author != keycloak_id:
        rid = await auth_client.resolve_internal_user_id(author, authorization)
        if rid:
            try:
                actor = await auth_client.get_user_by_keycloak_id(keycloak_id, authorization)
                name = actor.get("full_name") or actor.get("username") or "Usuário"
            except Exception:
                name = "Usuário"
            await send_notification(
                recipient_internal_user_id=str(rid),
                actor_keycloak_id=keycloak_id,
                notification_type="post_comment",
                title=f"{name} comentou no seu post",
                message=f"{name} comentou no seu post",
                extra_data={
                    "actorName": name,
                    "commentContent": content,
                    "postContent": post.content,
                },
                entity_id=post_id,
            )
    return c


async def list_comments(
    session: AsyncSession, post_id: uuid.UUID, page: int, size: int
) -> tuple[list[Comment], int]:
    stmt = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
    )
    total = int(
        await session.scalar(
            select(func.count()).select_from(
                select(Comment.id).where(Comment.post_id == post_id).subquery()
            )
        )
        or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def update_comment(
    session: AsyncSession,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    keycloak_id: str,
    content: str,
) -> Comment:
    await assert_content_allowed(content)

    c = await session.get(Comment, comment_id)
    if not c or c.post_id != post_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comentário não encontrado")
    if c.keycloak_id != keycloak_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão")
    c.content = content
    c.is_edited = True
    return c


async def delete_comment(
    session: AsyncSession,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    keycloak_id: str,
) -> None:
    c = await session.get(Comment, comment_id)
    if not c or c.post_id != post_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comentário não encontrado")
    if c.keycloak_id != keycloak_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão")
    post = await session.get(Post, post_id)
    if post:
        post.comments_count = max(0, post.comments_count - 1)
    await session.delete(c)


async def share_post(
    session: AsyncSession,
    post_id: uuid.UUID,
    keycloak_id: str,
    comment: str | None,
    authorization: str,
) -> Share:
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post não encontrado")

    exists = await session.scalar(
        select(Share).where(Share.post_id == post_id, Share.keycloak_id == keycloak_id)
    )
    if exists:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você já compartilhou este post")

    sh = Share(post_id=post_id, keycloak_id=keycloak_id, comment=comment)
    session.add(sh)
    await session.flush()
    post.shares_count = post.shares_count + 1

    author = post.created_by_keycloak_id
    if author and author != keycloak_id:
        rid = await auth_client.resolve_internal_user_id(author, authorization)
        if rid:
            try:
                actor = await auth_client.get_user_by_keycloak_id(keycloak_id, authorization)
                name = actor.get("full_name") or actor.get("username") or "Usuário"
            except Exception:
                name = "Usuário"
            ex: dict[str, Any] = {"actorName": name, "postContent": post.content}
            if comment:
                ex["shareComment"] = comment
            await send_notification(
                recipient_internal_user_id=str(rid),
                actor_keycloak_id=keycloak_id,
                notification_type="post_share",
                title=f"{name} compartilhou seu post",
                message=f"{name} compartilhou seu post",
                extra_data=ex,
                entity_id=post_id,
            )
    return sh


async def unshare_post(session: AsyncSession, post_id: uuid.UUID, keycloak_id: str) -> None:
    sh = await session.scalar(
        select(Share).where(Share.post_id == post_id, Share.keycloak_id == keycloak_id)
    )
    if not sh:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Compartilhamento não encontrado")
    post = await session.get(Post, post_id)
    if post:
        post.shares_count = max(0, post.shares_count - 1)
    await session.delete(sh)


async def has_shared(session: AsyncSession, post_id: uuid.UUID, keycloak_id: str) -> bool:
    q = await session.scalar(
        select(func.count())
        .select_from(Share)
        .where(Share.post_id == post_id, Share.keycloak_id == keycloak_id)
    )
    return bool(q)


async def list_my_shares(
    session: AsyncSession, keycloak_id: str, page: int, size: int
) -> tuple[list[Share], int]:
    stmt = (
        select(Share)
        .options(selectinload(Share.post))
        .where(Share.keycloak_id == keycloak_id)
        .order_by(Share.created_at.desc())
    )
    total = int(
        await session.scalar(
            select(func.count())
            .select_from(Share)
            .where(Share.keycloak_id == keycloak_id)
        )
        or 0
    )
    rows = (await session.scalars(stmt.offset(page * size).limit(size))).all()
    return list(rows), total


async def list_user_shares(
    session: AsyncSession, keycloak_id: str, page: int, size: int
) -> tuple[list[Share], int]:
    return await list_my_shares(session, keycloak_id, page, size)


async def share_count(session: AsyncSession, post_id: uuid.UUID) -> int:
    q = await session.scalar(
        select(func.count()).select_from(Share).where(Share.post_id == post_id)
    )
    return int(q or 0)
