"""Schemas para eventos de jogo e chat."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from live_service.common.enums import MatchEventType


class PublishMatchEventBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: MatchEventType
    payload: dict[str, Any]


class MatchEventResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    live_id: str = Field(..., alias="liveId")
    type: MatchEventType
    payload: dict[str, Any]
    timestamp: str


class ChatHistoryResponse(BaseModel):
    messages: list[dict[str, Any]]
    count: int
