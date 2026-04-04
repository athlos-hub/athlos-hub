import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    keycloak_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text)
    specialization: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[Optional[str]] = mapped_column(String(100))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    followers_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    following_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    posts_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    achievements_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    social_links: Mapped[Optional[dict]] = mapped_column(JSONB)
    achievements: Mapped[Optional[dict]] = mapped_column(JSONB)
    statistics: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )


class OrganizationProfile(Base):
    __tablename__ = "organization_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    organization_slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    website: Mapped[Optional[str]] = mapped_column(String(512))
    followers_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    posts_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    social_links: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )


class TeamProfile(Base):
    __tablename__ = "team_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    team_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    organization_slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    followers_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    posts_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    achievements_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    social_links: Mapped[Optional[dict]] = mapped_column(JSONB)
    achievements: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )
