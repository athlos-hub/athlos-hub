"""Schemas Pydantic para lives."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from live_service.common.enums import LiveStatus


class CreateLiveBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    external_match_id: str = Field(..., alias="externalMatchId")
    organization_id: str = Field(..., alias="organizationId")


class LiveResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    external_match_id: str = Field(..., alias="externalMatchId")
    organization_id: str = Field(..., alias="organizationId")
    stream_key: str = Field(..., alias="streamKey")
    status: LiveStatus
    started_at: datetime | None = Field(None, alias="startedAt")
    ended_at: datetime | None = Field(None, alias="endedAt")
    created_at: datetime = Field(..., alias="createdAt")


class ListLivesQuery(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: LiveStatus | None = None
    organization_id: str | None = Field(None, alias="organizationId")
    external_match_id: str | None = Field(None, alias="externalMatchId")
