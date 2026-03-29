# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.

from fastapi import APIRouter, Query

from live_service.api.deps import EventServiceDep, GatewayUserDep
from live_service.schemas.event import (
    ChatHistoryResponse,
    MatchEventResponse,
    PublishMatchEventBody,
)

router = APIRouter(prefix="/lives", tags=["events"])


@router.post(
    "/{live_id}/events",
    response_model=MatchEventResponse,
    response_model_by_alias=True,
    status_code=201,
)
async def publish_match_event(
    live_id: str,
    body: PublishMatchEventBody,
    svc: EventServiceDep,
    user: GatewayUserDep,
) -> MatchEventResponse:
    return await svc.publish_event(live_id, user.sub, body)


@router.get(
    "/{live_id}/events",
    response_model=list[MatchEventResponse],
    response_model_by_alias=True,
)
async def get_events_history(
    live_id: str,
    svc: EventServiceDep,
    limit: int | None = Query(None),
) -> list[MatchEventResponse]:
    return await svc.get_events_history(live_id, limit)


@router.get("/{live_id}/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    live_id: str,
    svc: EventServiceDep,
    limit: int = Query(50, ge=1, le=500),
) -> ChatHistoryResponse:
    data = await svc.get_chat_history(live_id, limit)
    return ChatHistoryResponse(messages=data["messages"], count=data["count"])
