"""Casos de uso de lives (criar, listar, transições, permissões)."""

import logging
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import LiveStatus
from live_service.infrastructure import redis_client as rc
from live_service.infrastructure.http_clients import AuthServiceClient
from live_service.repositories.live_repository import LiveRepository
from live_service.schemas.live import CreateLiveBody, LiveResponse

logger = logging.getLogger(__name__)

MANAGE_ROLES = frozenset({"OWNER", "ORGANIZER"})


def _to_response(row) -> LiveResponse:
    return LiveResponse(
        id=row.id,
        external_match_id=row.external_match_id,
        organization_id=row.organization_id,
        stream_key=row.stream_key,
        status=LiveStatus(row.status),
        started_at=row.started_at,
        ended_at=row.ended_at,
        created_at=row.created_at,
    )


class LiveService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = LiveRepository(session)
        self._auth = AuthServiceClient()

    async def user_can_manage_organization_live(
        self, keycloak_sub: str, organization_id: str
    ) -> bool:
        """Verificação explícita via get_organization_permission_details (Nest: checkOrganizationPermission)."""

        details = await self._auth.get_organization_permission_details(
            keycloak_sub, organization_id
        )
        if not details.has_permission:
            return False
        role = (details.role or "").upper()
        return role in MANAGE_ROLES

    async def create_live(self, body: CreateLiveBody) -> LiveResponse:
        stream_key = secrets.token_hex(24)
        live = await self._repo.create(
            external_match_id=body.external_match_id,
            organization_id=body.organization_id,
            stream_key=stream_key,
            status=LiveStatus.SCHEDULED,
        )
        r = rc.redis_client.client()
        await rc.save_stream_key_metadata(
            r,
            stream_key,
            live_id=live.id,
            organization_id=body.organization_id,
        )
        return _to_response(live)

    async def list_lives(
        self,
        *,
        status: LiveStatus | None,
        organization_id: str | None,
        external_match_id: str | None,
    ) -> list[LiveResponse]:
        rows = await self._repo.find_many(
            status=status,
            organization_id=organization_id,
            external_match_id=external_match_id,
        )
        return [_to_response(r) for r in rows]

    async def get_by_id(self, live_id: str) -> LiveResponse:
        row = await self._repo.find_by_id(live_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live não encontrada")
        return _to_response(row)

    async def finish_live(self, live_id: str, keycloak_sub: str) -> LiveResponse:
        live = await self._repo.find_by_id(live_id)
        if not live:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Live não encontrada")

        if not await self.user_can_manage_organization_live(
            keycloak_sub, live.organization_id
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Você não tem permissão para finalizar esta live",
            )

        if live.status != LiveStatus.LIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transição inválida: status {live.status}",
            )

        ended = datetime.now(timezone.utc)
        live.status = LiveStatus.FINISHED.value
        live.ended_at = ended
        await self._repo.save_entity(live)

        r = rc.redis_client.client()
        await rc.mark_stream_inactive(r, live.stream_key)

        return _to_response(live)

    async def cancel_live(self, live_id: str, keycloak_sub: str) -> LiveResponse:
        live = await self._repo.find_by_id(live_id)
        if not live:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Live não encontrada")

        if not await self.user_can_manage_organization_live(
            keycloak_sub, live.organization_id
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Você não tem permissão para cancelar esta live",
            )

        if live.status != LiveStatus.SCHEDULED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transição inválida: status {live.status}",
            )

        ended = datetime.now(timezone.utc)
        live.status = LiveStatus.CANCELLED.value
        live.ended_at = ended
        await self._repo.save_entity(live)
        return _to_response(live)
