# JWT validation is handled exclusively by Kong Gateway.
# This service trusts X-Keycloak-Sub injected by Kong.
# Do NOT add JWT validation here — it breaks the single-responsibility contract.

from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from live_service.api.deps import GatewayUserDep, GoogleCalendarServiceDep
from live_service.core.config import settings
from live_service.schemas.google_calendar import (
    CalendarUrlItemResponse,
    CalendarUrlSingleResponse,
    CreateCalendarEventBody,
    CreateMultipleCalendarEventsBody,
    GenerateCalendarUrlBody,
    GenerateMultipleCalendarUrlsBody,
)

router = APIRouter(prefix="/google-calendar", tags=["google-calendar"])


@router.post("/generate-url", response_model=CalendarUrlSingleResponse)
async def generate_calendar_url_post(
    body: GenerateCalendarUrlBody,
    svc: GoogleCalendarServiceDep,
    _user: GatewayUserDep,
) -> CalendarUrlSingleResponse:
    base = body.frontend_base_url or settings.FRONTEND_BASE_URL
    url = await svc.generate_calendar_url(body.live_id, base, body.match)
    return CalendarUrlSingleResponse(url=url)


@router.post("/generate-multiple-urls", response_model=list[CalendarUrlItemResponse])
async def generate_multiple_urls(
    body: GenerateMultipleCalendarUrlsBody,
    svc: GoogleCalendarServiceDep,
    _user: GatewayUserDep,
) -> list[CalendarUrlItemResponse]:
    base = body.frontend_base_url or settings.FRONTEND_BASE_URL
    raw = await svc.generate_multiple_calendar_urls(
        body.live_ids,
        base,
        body.matches_by_live_id,
    )
    return [CalendarUrlItemResponse(liveId=r["liveId"], url=r["url"]) for r in raw]


@router.get("/generate-url", response_model=CalendarUrlSingleResponse)
async def generate_calendar_url_get(
    svc: GoogleCalendarServiceDep,
    _user: GatewayUserDep,
    live_id: str = Query(..., alias="liveId"),
    frontend_base_url: str | None = Query(None, alias="frontendBaseUrl"),
) -> CalendarUrlSingleResponse:
    base = frontend_base_url or settings.FRONTEND_BASE_URL
    url = await svc.generate_calendar_url(live_id, base, None)
    return CalendarUrlSingleResponse(url=url)


@router.post("/create-event", status_code=201)
async def create_event(
    body: CreateCalendarEventBody,
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
) -> dict:
    base = body.frontend_base_url or settings.FRONTEND_BASE_URL
    force = body.force is True
    r = await svc.create_calendar_event(
        user.sub, body.live_id, base, force, body.match
    )
    return {
        "success": True,
        "eventId": r["eventId"],
        "htmlLink": r["htmlLink"],
        "alreadyExists": r["alreadyExists"],
    }


@router.post("/create-multiple-events", status_code=201)
async def create_multiple_events(
    body: CreateMultipleCalendarEventsBody,
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
) -> dict:
    base = body.frontend_base_url or settings.FRONTEND_BASE_URL
    force = body.force is True
    results = await svc.create_multiple_calendar_events(
        user.sub,
        body.live_ids,
        base,
        force,
        body.matches_by_live_id,
    )
    return {"success": True, "results": results}


@router.get("/events")
async def get_events_existence(
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
    live_ids: str = Query(..., alias="liveIds"),
) -> dict:
    ids = [x for x in live_ids.split(",") if x.strip()]
    results = await svc.check_multiple_events_existence(user.sub, ids)
    return {"results": results}


oauth_router = APIRouter(prefix="/google-calendar/oauth", tags=["google-calendar-oauth"])


def _frontend_oauth_redirect(query: str) -> RedirectResponse:
    """Callback costuma ser em :8100 (Kong); erros/sucesso devem ir ao Next (:3000)."""
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return RedirectResponse(f"{base}{query}")


@oauth_router.get("/authorize")
async def oauth_authorize(
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
    redirect: str | None = Query(None),
):
    state = f"{user.sub}|{redirect}" if redirect else user.sub
    url = svc.get_authorization_url(user.sub, state)
    return RedirectResponse(url)


@oauth_router.get("/authorize-url")
async def oauth_authorize_url(
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
    redirect: str | None = Query(None),
) -> dict:
    state = f"{user.sub}|{redirect}" if redirect else user.sub
    url = svc.get_authorization_url(user.sub, state)
    return {"url": url}


@oauth_router.get("/callback")
async def oauth_callback(
    svc: GoogleCalendarServiceDep,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
):
    if error:
        return _frontend_oauth_redirect(
            f"/?error=oauth_cancelled&message={quote(error)}"
        )
    if not code:
        return _frontend_oauth_redirect(
            "/?error=oauth_failed&message="
            + quote("Código de autorização não fornecido")
        )
    parts = (state or "").split("|", 1)
    user_id = parts[0]
    redirect_path = parts[1] if len(parts) > 1 else None
    if not user_id:
        return _frontend_oauth_redirect(
            "/?error=oauth_failed&message=" + quote("State inválido")
        )
    try:
        tokens = await svc.exchange_code_for_tokens(code)
        await svc.save_oauth_tokens_from_response(user_id, tokens)
    except HTTPException as exc:
        detail = exc.detail
        msg = detail if isinstance(detail, str) else str(detail)
        return _frontend_oauth_redirect(f"/?error=oauth_failed&message={quote(msg)}")
    except Exception as exc:
        return _frontend_oauth_redirect(
            f"/?error=oauth_failed&message={quote(str(exc))}"
        )
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    if redirect_path and redirect_path.startswith("http"):
        target = redirect_path
    elif redirect_path:
        target = base + (redirect_path if redirect_path.startswith("/") else f"/{redirect_path}")
    else:
        target = f"{base}/jogos?google_calendar_connected=true"
    return RedirectResponse(target)


@oauth_router.get("/status")
async def oauth_status(
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
) -> dict:
    ok = await svc.is_authorized(user.sub)
    return {"authorized": ok}


@oauth_router.get("/revoke")
async def oauth_revoke(
    svc: GoogleCalendarServiceDep,
    user: GatewayUserDep,
) -> dict:
    await svc.revoke_authorization(user.sub)
    return {"message": "Autorização revogada com sucesso"}
