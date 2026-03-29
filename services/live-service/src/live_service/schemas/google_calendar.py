"""Schemas Google Calendar (URLs, OAuth, eventos)."""

from typing import Any

from pydantic import BaseModel, Field


class TeamDto(BaseModel):
    name: str | None = None
    logo: str | None = None


class MatchDto(BaseModel):
    home_team: TeamDto | None = Field(None, alias="homeTeam")
    away_team: TeamDto | None = Field(None, alias="awayTeam")
    scheduled_datetime: str | None = Field(None, alias="scheduledDatetime")
    competition_name: str | None = Field(None, alias="competitionName")
    round_name: str | None = Field(None, alias="roundName")
    group_name: str | None = Field(None, alias="groupName")
    local: str | None = None
    external_match_id: str | None = Field(None, alias="externalMatchId")
    home_score: int | None = Field(None, alias="homeScore")
    away_score: int | None = Field(None, alias="awayScore")

    model_config = {"populate_by_name": True}


class GenerateCalendarUrlBody(BaseModel):
    live_id: str = Field(..., alias="liveId")
    frontend_base_url: str | None = Field(None, alias="frontendBaseUrl")
    match: MatchDto | None = None

    model_config = {"populate_by_name": True}


class GenerateMultipleCalendarUrlsBody(BaseModel):
    live_ids: list[str] = Field(..., alias="liveIds")
    frontend_base_url: str | None = Field(None, alias="frontendBaseUrl")
    matches_by_live_id: dict[str, MatchDto] | None = Field(
        None, alias="matchesByLiveId"
    )

    model_config = {"populate_by_name": True}


class CreateCalendarEventBody(BaseModel):
    live_id: str = Field(..., alias="liveId")
    frontend_base_url: str | None = Field(None, alias="frontendBaseUrl")
    force: bool | None = False
    match: MatchDto | None = None

    model_config = {"populate_by_name": True}


class CreateMultipleCalendarEventsBody(BaseModel):
    live_ids: list[str] = Field(..., alias="liveIds")
    frontend_base_url: str | None = Field(None, alias="frontendBaseUrl")
    force: bool | None = False
    matches_by_live_id: dict[str, MatchDto] | None = Field(
        None, alias="matchesByLiveId"
    )

    model_config = {"populate_by_name": True}


class CalendarUrlSingleResponse(BaseModel):
    url: str


class CalendarUrlItemResponse(BaseModel):
    live_id: str = Field(..., alias="liveId")
    url: str

    model_config = {"populate_by_name": True}
