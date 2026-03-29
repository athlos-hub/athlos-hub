"""Schemas dos webhooks MediaMTX."""

from pydantic import BaseModel


class MediaMTXAuthBody(BaseModel):
    ip: str
    user: str | None = None
    password: str | None = None
    path: str
    protocol: str
    id: str | None = None
    action: str
    query: str | None = None


class OnPublishDoneBody(BaseModel):
    path: str
    protocol: str | None = None
    query: str | None = None
    ip: str | None = None
    user: str | None = None
