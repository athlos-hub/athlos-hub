from __future__ import annotations

from typing import Any

from src.models import Comment, Post, Share
from src.schemas.common import iso_datetime


def post_to_camel(p: Post) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "profileType": p.profile_type,
        "profileId": p.profile_id,
        "createdByKeycloakId": p.created_by_keycloak_id,
        "content": p.content,
        "mediaUrls": p.media_urls,
        "metadata": p.metadata_,
        "type": p.type,
        "visibility": p.visibility,
        "likesCount": p.likes_count,
        "commentsCount": p.comments_count,
        "sharesCount": p.shares_count,
        "isPinned": p.is_pinned,
        "createdAt": iso_datetime(p.created_at),
        "updatedAt": iso_datetime(p.updated_at),
    }


def comment_to_camel(c: Comment) -> dict[str, Any]:
    return {
        "id": str(c.id),
        "postId": str(c.post_id),
        "keycloakId": c.keycloak_id,
        "content": c.content,
        "likesCount": c.likes_count,
        "isEdited": c.is_edited,
        "createdAt": iso_datetime(c.created_at),
        "updatedAt": iso_datetime(c.updated_at),
    }


def share_to_camel(s: Share, post: Post | None = None) -> dict[str, Any]:
    d: dict[str, Any] = {
        "id": str(s.id),
        "postId": str(s.post_id),
        "keycloakId": s.keycloak_id,
        "comment": s.comment,
        "createdAt": iso_datetime(s.created_at),
        "updatedAt": iso_datetime(s.updated_at),
    }
    if post is not None:
        d["post"] = post_to_camel(post)
    return d
