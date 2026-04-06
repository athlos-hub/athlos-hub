"""URLs públicas Google Calendar, OAuth2 e criação de eventos na API."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote, urlencode
from zoneinfo import ZoneInfo

import httpx
from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import LiveStatus
from live_service.core.config import settings
from live_service.infrastructure.database.models.google_calendar_event import (
    GoogleCalendarEvent,
)
from live_service.infrastructure.database.models.google_calendar_token import (
    GoogleCalendarToken,
)
from live_service.infrastructure.database.models.live import Live
from live_service.infrastructure.google_calendar_client import build_calendar_v3_service
from live_service.schemas.google_calendar import MatchDto

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def _row_to_tokens(row: GoogleCalendarToken) -> dict[str, Any]:
    return dict(row.tokens) if isinstance(row.tokens, dict) else {}


class GoogleCalendarService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _get_token_row(self, user_id: str) -> GoogleCalendarToken | None:
        r = await self._session.execute(
            select(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user_id)
        )
        return r.scalar_one_or_none()

    async def _save_tokens(
        self,
        user_id: str,
        access_token: str,
        refresh_token: str | None,
        expires_in: int,
        scope: str | None,
    ) -> None:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        payload = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
            "scope": scope,
        }
        existing = await self._get_token_row(user_id)
        if existing:
            existing.tokens = payload
            existing.updated_at = datetime.now(timezone.utc)
        else:
            self._session.add(
                GoogleCalendarToken(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    tokens=payload,
                )
            )
        await self._session.flush()

    async def save_oauth_tokens_from_response(
        self, user_id: str, oauth_json: dict[str, Any]
    ) -> None:
        await self._save_tokens(
            user_id,
            str(oauth_json["access_token"]),
            oauth_json.get("refresh_token"),
            int(oauth_json.get("expires_in", 3600)),
            oauth_json.get("scope"),
        )

    async def get_valid_access_token(self, user_id: str) -> str:
        row = await self._get_token_row(user_id)
        if not row:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Usuário não autorizado. Conecte sua conta do Google Calendar.",
            )
        data = _row_to_tokens(row)
        exp_raw = data.get("expires_at")
        refresh = data.get("refresh_token")
        access = data.get("access_token")
        if not access:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Token inválido.",
            )
        expires_at = (
            datetime.fromisoformat(str(exp_raw).replace("Z", "+00:00"))
            if exp_raw
            else None
        )
        now = datetime.now(timezone.utc)
        if expires_at and expires_at > now:
            return access
        if not refresh or not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            return access
        new_access, exp_in = await self._refresh_access_token(str(refresh))
        await self._save_tokens(
            user_id,
            new_access,
            refresh,
            exp_in,
            data.get("scope"),
        )
        return new_access

    async def _refresh_access_token(self, refresh_token: str) -> tuple[str, int]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if not response.is_success:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Falha ao atualizar token: {response.text}",
            )
        body = response.json()
        return body["access_token"], int(body.get("expires_in", 3600))

    def get_authorization_url(self, user_id: str, state: str | None) -> str:
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Google OAuth não configurado. Verifique GOOGLE_CLIENT_ID.",
            )
        redirect = settings.google_redirect_uri_effective
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/calendar.events",
            "access_type": "offline",
            "prompt": "consent",
            "state": state or user_id,
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(self, code: str) -> dict[str, Any]:
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Google OAuth não configurado.",
            )
        redirect = settings.google_redirect_uri_effective
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if not response.is_success:
            detail = response.text
            try:
                err = response.json()
                if err.get("error") == "invalid_client":
                    detail = (
                        "Credenciais OAuth inválidas: verifique GOOGLE_CLIENT_ID e "
                        "GOOGLE_CLIENT_SECRET no .env do live-service (mesmo cliente "
                        '"Aplicativo da Web" no Google Cloud Console; secret sem espaços extras). '
                        f"Resposta Google: {err}"
                    )
                elif err.get("error") == "redirect_uri_mismatch":
                    detail = (
                        "redirect_uri não coincide: em Google Cloud Console → Credenciais → "
                        "URIs de redirecionamento autorizados, inclua exatamente: "
                        f"{settings.google_redirect_uri_effective}. Resposta: {err}"
                    )
                else:
                    detail = f"Falha ao obter tokens: {err}"
            except Exception:
                detail = f"Falha ao obter tokens: {response.text}"
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=detail)
        return response.json()

    async def is_authorized(self, user_id: str) -> bool:
        row = await self._get_token_row(user_id)
        return row is not None

    async def revoke_authorization(self, user_id: str) -> None:
        await self._session.execute(
            delete(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user_id)
        )

    async def check_event_exists(
        self, user_id: str, live_id: str
    ) -> tuple[bool, str | None, str | None]:
        r = await self._session.execute(
            select(GoogleCalendarEvent).where(
                GoogleCalendarEvent.user_id == user_id,
                GoogleCalendarEvent.live_id == live_id,
            )
        )
        row = r.scalar_one_or_none()
        if not row:
            return False, None, None
        return True, row.event_id, row.html_link

    def _get_start_date(self, live: Live) -> datetime:
        if live.started_at:
            return live.started_at
        created = live.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if live.status == LiveStatus.SCHEDULED.value and created < now:
            return now + timedelta(hours=1)
        return created

    def _get_end_date(self, start: datetime) -> datetime:
        return start + timedelta(hours=2)

    def _format_google_cal(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
        return dt.strftime("%Y%m%dT%H%M%SZ")

    def build_calendar_url(
        self, live: Live, frontend_base_url: str, match: MatchDto | None
    ) -> str:
        base = "https://calendar.google.com/calendar/render"
        title = self._event_title(live, match)
        start = self._get_start_date(live)
        end = self._get_end_date(start)
        desc = (
            self._build_description_from_match(match, live, frontend_base_url)
            if match
            else self._build_description(live, frontend_base_url)
        )
        q = (
            f"action=TEMPLATE&text={quote(title)}&dates="
            f"{self._format_google_cal(start)}/{self._format_google_cal(end)}"
            f"&details={quote(desc)}"
        )
        return f"{base}?{q}"

    def _event_title(self, live: Live, match: MatchDto | None) -> str:
        if not match:
            return f"Live: {live.external_match_id}"
        if match.competition_name:
            home = match.home_team.name if match.home_team and match.home_team.name else ""
            away = match.away_team.name if match.away_team and match.away_team.name else ""
            return f"Live: {match.competition_name} - {home} x {away}".strip()
        if match.home_team and match.away_team:
            hn = match.home_team.name or ""
            an = match.away_team.name or ""
            if hn and an:
                return f"Live: {hn} x {an}"
        return f"Live: {live.external_match_id}"

    def _build_description(self, live: Live, frontend_base_url: str) -> str:
        lines = [
            f"Partida: {live.external_match_id}",
            f"Status: {live.status}",
            f"Organização: {live.organization_id}",
            "",
            f"Acesse a live em: {frontend_base_url}/jogos/{live.id}",
        ]
        return "\n".join(lines)

    def _format_scheduled_datetime(self, dt_str: str) -> str:
        try:
            dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            brt = dt.astimezone(ZoneInfo("America/Sao_Paulo"))
            return brt.strftime("%d/%m/%Y às %H:%M (Horário de Brasília)")
        except Exception:
            return dt_str

    def _build_description_from_match(
        self, match: MatchDto, live: Live, frontend_base_url: str
    ) -> str:
        lines: list[str] = []
        if match.competition_name:
            lines.append(f"Competição: {match.competition_name}")
        if match.round_name:
            lines.append(f"Rodada: {match.round_name}")
        if match.group_name:
            lines.append(f"Grupo: {match.group_name}")
        if match.home_team or match.away_team:
            home = match.home_team.name if match.home_team else "Casa"
            away = match.away_team.name if match.away_team else "Visitante"
            lines.append(f"Confronto: {home} x {away}")
        if match.local:
            lines.append(f"Local: {match.local}")
        if match.scheduled_datetime:
            lines.append(f"Horário: {self._format_scheduled_datetime(match.scheduled_datetime)}")
        lines.extend(["", f"Acesse a live em: {frontend_base_url}/jogos/{live.id}"])
        return "\n".join(lines)

    async def generate_calendar_url(
        self, live_id: str, frontend_base_url: str, match: MatchDto | None
    ) -> str:
        live = await self._session.get(Live, live_id)
        if not live:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Live não encontrada")
        return self.build_calendar_url(live, frontend_base_url, match)

    async def generate_multiple_calendar_urls(
        self,
        live_ids: list[str],
        frontend_base_url: str,
        matches_by_live_id: dict[str, MatchDto] | None,
    ) -> list[dict[str, str]]:
        out: list[dict[str, str]] = []
        for lid in live_ids:
            live = await self._session.get(Live, lid)
            if live:
                m = matches_by_live_id.get(lid) if matches_by_live_id else None
                out.append(
                    {
                        "liveId": live.id,
                        "url": self.build_calendar_url(live, frontend_base_url, m),
                    }
                )
        if not out:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail="Nenhuma live válida encontrada",
            )
        return out

    async def create_calendar_event(
        self,
        user_id: str,
        live_id: str,
        frontend_base_url: str,
        force: bool,
        match: MatchDto | None,
    ) -> dict[str, Any]:
        exists, ev_id, link = await self.check_event_exists(user_id, live_id)
        if exists and not force and ev_id and link:
            return {
                "eventId": ev_id,
                "htmlLink": link,
                "alreadyExists": True,
            }

        if exists and force:
            await self._session.execute(
                delete(GoogleCalendarEvent).where(
                    GoogleCalendarEvent.user_id == user_id,
                    GoogleCalendarEvent.live_id == live_id,
                )
            )
            await self._session.flush()

        live = await self._session.get(Live, live_id)
        if not live:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Live não encontrada")
        if live.status != LiveStatus.SCHEDULED.value:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Apenas lives agendadas. Status: {live.status}",
            )

        access = await self.get_valid_access_token(user_id)
        service = build_calendar_v3_service(access)

        start_date = self._get_start_date(live)
        end_date = self._get_end_date(start_date)
        if match and match.scheduled_datetime:
            start_date = datetime.fromisoformat(
                match.scheduled_datetime.replace("Z", "+00:00")
            )
            end_date = start_date + timedelta(hours=2)

        summary = self._event_title(live, match)
        description = (
            self._build_description_from_match(match, live, frontend_base_url)
            if match
            else self._build_description(live, frontend_base_url)
        )

        body = {
            "summary": summary,
            "description": description,
            "start": {
                "dateTime": start_date.astimezone(timezone.utc).isoformat(),
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end_date.astimezone(timezone.utc).isoformat(),
                "timeZone": "UTC",
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 60},
                ],
            },
        }

        def _insert() -> dict[str, Any]:
            return (
                service.events()
                .insert(calendarId="primary", body=body)
                .execute()
            )

        ins = await asyncio.to_thread(_insert)
        event_id = ins.get("id") or ""
        html_link = ins.get("htmlLink") or ""

        gce = GoogleCalendarEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            live_id=live_id,
            event_id=event_id,
            html_link=html_link,
        )
        self._session.add(gce)
        await self._session.flush()

        return {
            "eventId": event_id,
            "htmlLink": html_link,
            "alreadyExists": False,
        }

    async def create_multiple_calendar_events(
        self,
        user_id: str,
        live_ids: list[str],
        frontend_base_url: str,
        force: bool,
        matches_by_live_id: dict[str, MatchDto] | None,
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for lid in live_ids:
            try:
                r = await self.create_calendar_event(
                    user_id,
                    lid,
                    frontend_base_url,
                    force,
                    matches_by_live_id.get(lid) if matches_by_live_id else None,
                )
                results.append(
                    {
                        "liveId": lid,
                        "eventId": r["eventId"],
                        "htmlLink": r["htmlLink"],
                        "success": True,
                        "alreadyExists": r["alreadyExists"],
                    }
                )
            except HTTPException as exc:
                results.append(
                    {
                        "liveId": lid,
                        "eventId": "",
                        "htmlLink": "",
                        "success": False,
                        "alreadyExists": False,
                        "error": str(exc.detail),
                    }
                )
            except Exception as exc:
                results.append(
                    {
                        "liveId": lid,
                        "eventId": "",
                        "htmlLink": "",
                        "success": False,
                        "alreadyExists": False,
                        "error": str(exc),
                    }
                )
        return results

    async def check_multiple_events_existence(
        self, user_id: str, live_ids: list[str]
    ) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for lid in live_ids:
            ex, eid, link = await self.check_event_exists(user_id, lid)
            out.append(
                {
                    "liveId": lid,
                    "exists": ex,
                    "eventId": eid or "",
                    "htmlLink": link or "",
                }
            )
        return out
