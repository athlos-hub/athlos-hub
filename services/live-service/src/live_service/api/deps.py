# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.

"""Dependências FastAPI."""

from typing import Annotated

from fastapi import Depends

from live_service.common.gateway_identity import GatewayUser, require_gateway_user
from live_service.infrastructure.database.dependencies import SessionDep
from live_service.services.event_service import EventService
from live_service.services.google_calendar_service import GoogleCalendarService
from live_service.services.live_service import LiveService
from live_service.services.webhook_service import WebhookService

# Identidade Kong (headers); nome alinhado ao padrão "get_current_user".
get_current_user = require_gateway_user

CurrentUserDep = Annotated[GatewayUser, Depends(get_current_user)]
GatewayUserDep = CurrentUserDep


def get_live_service(session: SessionDep) -> LiveService:
    return LiveService(session)


def get_event_service(session: SessionDep) -> EventService:
    return EventService(session)


def get_webhook_service(session: SessionDep) -> WebhookService:
    return WebhookService(session)


def get_google_calendar_service(session: SessionDep) -> GoogleCalendarService:
    return GoogleCalendarService(session)


LiveServiceDep = Annotated[LiveService, Depends(get_live_service)]
EventServiceDep = Annotated[EventService, Depends(get_event_service)]
WebhookServiceDep = Annotated[WebhookService, Depends(get_webhook_service)]
GoogleCalendarServiceDep = Annotated[
    GoogleCalendarService, Depends(get_google_calendar_service)
]
