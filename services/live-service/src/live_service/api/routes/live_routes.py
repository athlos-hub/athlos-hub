# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.

from fastapi import APIRouter, Query

from live_service.api.deps import GatewayUserDep, LiveServiceDep
from live_service.common.enums import LiveStatus
from live_service.schemas.live import CreateLiveBody, LiveResponse

router = APIRouter(prefix="/lives", tags=["lives"])


@router.post("", response_model=LiveResponse, response_model_by_alias=True)
async def create_live(body: CreateLiveBody, svc: LiveServiceDep) -> LiveResponse:
    return await svc.create_live(body)


@router.get("", response_model=list[LiveResponse], response_model_by_alias=True)
async def list_lives(
    svc: LiveServiceDep,
    status: LiveStatus | None = None,
    organization_id: str | None = Query(None, alias="organizationId"),
    external_match_id: str | None = Query(None, alias="externalMatchId"),
) -> list[LiveResponse]:
    return await svc.list_lives(
        status=status,
        organization_id=organization_id,
        external_match_id=external_match_id,
    )


@router.get("/{live_id}", response_model=LiveResponse, response_model_by_alias=True)
async def get_live(live_id: str, svc: LiveServiceDep) -> LiveResponse:
    return await svc.get_by_id(live_id)


@router.patch("/{live_id}/finish", response_model=LiveResponse, response_model_by_alias=True)
async def finish_live(
    live_id: str,
    svc: LiveServiceDep,
    user: GatewayUserDep,
) -> LiveResponse:
    return await svc.finish_live(live_id, user.sub)


@router.patch("/{live_id}/cancel", response_model=LiveResponse, response_model_by_alias=True)
async def cancel_live(
    live_id: str,
    svc: LiveServiceDep,
    user: GatewayUserDep,
) -> LiveResponse:
    return await svc.cancel_live(live_id, user.sub)
