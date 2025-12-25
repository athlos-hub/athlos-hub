from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPublic(BaseModel):
    id: UUID
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(default=None, alias="firstName")
    last_name: Optional[str] = Field(default=None, alias="lastName")
    avatar_url: Optional[str] = Field(default=None, alias="avatarUrl")
    last_login_at: Optional[datetime] = Field(default=None, alias="lastLoginAt")
    enabled: bool = True
    email_verified: bool = Field(default=False, alias="emailVerified")
    created_at: Optional[datetime] = Field(default=None, alias="createdTimestamp")

    model_config = ConfigDict(
        populate_by_name=True, from_attributes=True, extra="ignore"
    )


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class ResendEmailRequest(BaseModel):
    email: EmailStr


class KeycloakTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
